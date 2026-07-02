import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { computeInvoicePaidState } from '../invoicing/invoices/presenters/invoice.presenter';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) {}

    async getStockBalance(tenantId: string, warehouseId?: string) {
        const where: any = { tenantId };
        if (warehouseId) where.warehouseId = warehouseId;
        return this.prisma.stockBalance.findMany({
            where,
            include: {
                item: { select: { code: true, name: true } },
                warehouse: { select: { code: true, name: true } },
            },
            orderBy: [{ warehouse: { code: 'asc' } }, { item: { code: 'asc' } }],
        });
    }

    async getSalesSummary(tenantId: string, filters: { from?: string; to?: string; partyId?: string }) {
        const where: any = { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' } };
        if (filters.partyId) where.partyId = filters.partyId;
        if (filters.from || filters.to) {
            where.date = {};
            if (filters.from) where.date.gte = new Date(filters.from);
            if (filters.to) where.date.lte = new Date(filters.to);
        }

        const invoices = await this.prisma.invoice.findMany({
            where,
            include: { party: { select: { name: true, code: true } } },
            orderBy: { date: 'desc' },
        });

        const totalSales = invoices.reduce((s, i) => s + Number(i.total), 0);
        return { invoices, totalSales, count: invoices.length };
    }

    async getPurchaseSummary(tenantId: string, filters: { from?: string; to?: string; partyId?: string }) {
        const where: any = { tenantId, status: 'POSTED', invoiceType: { direction: 'PURCHASE' } };
        if (filters.partyId) where.partyId = filters.partyId;
        if (filters.from || filters.to) {
            where.date = {};
            if (filters.from) where.date.gte = new Date(filters.from);
            if (filters.to) where.date.lte = new Date(filters.to);
        }

        const invoices = await this.prisma.invoice.findMany({
            where,
            include: { party: { select: { name: true, code: true } } },
            orderBy: { date: 'desc' },
        });

        const totalPurchases = invoices.reduce((s, i) => s + Number(i.total), 0);
        return { invoices, totalPurchases, count: invoices.length };
    }

    async getPartyStatement(tenantId: string, partyId: string) {
        const [party, invoices, payments] = await Promise.all([
            this.prisma.party.findFirst({ where: { id: partyId, tenantId } }),
            this.prisma.invoice.findMany({
                where: { tenantId, partyId, status: 'POSTED' },
                include: {
                    invoiceType: { select: { direction: true } },
                    paymentAllocations: { select: { amount: true } },
                },
                orderBy: { date: 'asc' },
            }),
            this.prisma.payment.findMany({
                where: { tenantId, partyId, status: 'POSTED' },
                orderBy: { date: 'asc' },
            }),
        ]);

        const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
        // "Paid" is derived from PaymentAllocation, matching the per-invoice amountPaid
        // shown in the dashboard — a payment only counts once it's actually allocated
        // to one of this party's invoices, not just received into a cashbox.
        const totalPaid = invoices.reduce(
            (s, i) => s + computeInvoicePaidState(i.total, i.paymentAllocations).amountPaid,
            0,
        );
        const balance = totalInvoiced - totalPaid;

        return { party, invoices, payments, totalInvoiced, totalPaid, balance };
    }

    async getProfitSummary(tenantId: string, filters: { from?: string; to?: string }) {
        const dateFilter: any = {};
        if (filters.from) dateFilter.gte = new Date(filters.from);
        if (filters.to) dateFilter.lte = new Date(filters.to);
        const hasDateFilter = Object.keys(dateFilter).length > 0;

        const saleWhere: any = { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' } };
        const purchaseWhere: any = { tenantId, status: 'POSTED', invoiceType: { direction: 'PURCHASE' } };
        const expenseWhere: any = { tenantId, status: 'POSTED' };

        if (hasDateFilter) {
            saleWhere.date = dateFilter;
            purchaseWhere.date = dateFilter;
            expenseWhere.date = dateFilter;
        }

        const [salesAgg, purchasesAgg, expenses] = await Promise.all([
            this.prisma.invoice.aggregate({ where: saleWhere, _sum: { total: true } }),
            this.prisma.invoice.aggregate({ where: purchaseWhere, _sum: { total: true } }),
            this.prisma.expense.aggregate({ where: expenseWhere, _sum: { totalAmount: true } }),
        ]);

        const totalSales = Number(salesAgg._sum.total || 0);
        const totalPurchases = Number(purchasesAgg._sum.total || 0);
        const totalExpenses = Number(expenses._sum.totalAmount || 0);
        const grossProfit = totalSales - totalPurchases;
        const netProfit = grossProfit - totalExpenses;

        return { totalSales, totalPurchases, totalExpenses, grossProfit, netProfit };
    }

    async getDashboardSummary(tenantId: string, filters?: { from?: string; to?: string }) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const from = filters?.from ? new Date(filters.from) : startOfMonth;
        const to = filters?.to ? new Date(filters.to) : today;
        const dateFilter = { gte: from, lte: to };

        const [
            salesAgg, purchasesAgg, expensesAgg,
            cashboxes, lowStockCount,
            partiesCount, itemsCount,
        ] = await Promise.all([
            this.prisma.invoice.aggregate({
                where: { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' }, date: dateFilter },
                _sum: { total: true },
            }),
            this.prisma.invoice.aggregate({
                where: { tenantId, status: 'POSTED', invoiceType: { direction: 'PURCHASE' }, date: dateFilter },
                _sum: { total: true },
            }),
            this.prisma.expense.aggregate({
                where: { tenantId, status: 'POSTED', date: dateFilter },
                _sum: { totalAmount: true },
            }),
            this.prisma.cashbox.findMany({
                where: { tenantId, isActive: true },
                include: { currency: { select: { code: true, symbol: true } } },
            }),
            this.prisma.stockBalance.count({ where: { tenantId, quantity: { lte: 0 } } }),
            this.prisma.party.count({ where: { tenantId, isActive: true } }),
            this.prisma.item.count({ where: { tenantId, isActive: true } }),
        ]);

        const totalSales = Number(salesAgg._sum.total || 0);
        const totalPurchases = Number(purchasesAgg._sum.total || 0);
        const totalExpenses = Number(expensesAgg._sum.totalAmount || 0);

        return {
            totalSales,
            totalPurchases,
            totalExpenses,
            netProfit: totalSales - totalPurchases - totalExpenses,
            cashboxes,
            lowStockItemsCount: lowStockCount,
            totalActiveParties: partiesCount,
            totalActiveItems: itemsCount,
        };
    }

    async getDashboardChartData(tenantId: string, filters?: { from?: string; to?: string }) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const from = filters?.from ? new Date(filters.from) : startOfMonth;
        const to = filters?.to ? new Date(filters.to) : today;

        // Cap at 90 days
        const cap = new Date(from);
        cap.setDate(cap.getDate() + 90);
        const cappedTo = to > cap ? cap : to;

        const [salesInvoices, purchaseInvoices] = await Promise.all([
            this.prisma.invoice.findMany({
                where: { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' }, date: { gte: from, lte: cappedTo } },
                select: { date: true, total: true },
                orderBy: { date: 'asc' },
            }),
            this.prisma.invoice.findMany({
                where: { tenantId, status: 'POSTED', invoiceType: { direction: 'PURCHASE' }, date: { gte: from, lte: cappedTo } },
                select: { date: true, total: true },
                orderBy: { date: 'asc' },
            }),
        ]);

        const map = new Map<string, { sales: number; purchases: number }>();

        for (const inv of salesInvoices) {
            const key = inv.date.toISOString().split('T')[0];
            const entry = map.get(key) ?? { sales: 0, purchases: 0 };
            entry.sales += Number(inv.total);
            map.set(key, entry);
        }

        for (const inv of purchaseInvoices) {
            const key = inv.date.toISOString().split('T')[0];
            const entry = map.get(key) ?? { sales: 0, purchases: 0 };
            entry.purchases += Number(inv.total);
            map.set(key, entry);
        }

        return Array.from(map.entries())
            .map(([date, values]) => ({ date, ...values }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
}
