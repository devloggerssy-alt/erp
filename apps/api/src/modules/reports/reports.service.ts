import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

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
                include: { invoiceType: { select: { direction: true } } },
                orderBy: { date: 'asc' },
            }),
            this.prisma.payment.findMany({
                where: { tenantId, partyId, status: 'POSTED' },
                orderBy: { date: 'asc' },
            }),
        ]);

        const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
        const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
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
        const expenseWhere: any = { tenantId, status: 'POSTED', type: 'EXPENSE' };

        if (hasDateFilter) {
            saleWhere.date = dateFilter;
            purchaseWhere.date = dateFilter;
            expenseWhere.date = dateFilter;
        }

        const [salesAgg, purchasesAgg, expenses] = await Promise.all([
            this.prisma.invoice.aggregate({ where: saleWhere, _sum: { total: true } }),
            this.prisma.invoice.aggregate({ where: purchaseWhere, _sum: { total: true } }),
            this.prisma.payment.aggregate({ where: expenseWhere, _sum: { amount: true } }),
        ]);

        const totalSales = Number(salesAgg._sum.total || 0);
        const totalPurchases = Number(purchasesAgg._sum.total || 0);
        const totalExpenses = Number(expenses._sum.amount || 0);
        const grossProfit = totalSales - totalPurchases;
        const netProfit = grossProfit - totalExpenses;

        return { totalSales, totalPurchases, totalExpenses, grossProfit, netProfit };
    }

    async getDashboardSummary(tenantId: string) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [
            salesToday, salesMonth,
            cashboxes, lowStockCount,
            partiesCount, itemsCount,
        ] = await Promise.all([
            this.prisma.invoice.aggregate({ where: { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' }, date: { gte: startOfDay } }, _sum: { total: true } }),
            this.prisma.invoice.aggregate({ where: { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' }, date: { gte: startOfMonth } }, _sum: { total: true } }),
            this.prisma.cashbox.findMany({ where: { tenantId, isActive: true }, include: { currency: { select: { code: true, symbol: true } } } }),
            this.prisma.stockBalance.count({ where: { tenantId, quantity: { lte: 0 } } }),
            this.prisma.party.count({ where: { tenantId, isActive: true } }),
            this.prisma.item.count({ where: { tenantId, isActive: true } }),
        ]);

        return {
            salesToday: Number(salesToday._sum.total || 0),
            salesThisMonth: Number(salesMonth._sum.total || 0),
            cashboxes,
            lowStockItemsCount: lowStockCount,
            totalActiveParties: partiesCount,
            totalActiveItems: itemsCount,
        };
    }
}
