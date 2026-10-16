import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';
import { computeInvoicePaidState } from '../invoicing';
import { ReportsPresenter } from './presenters/reports.presenter';

type LockedRate = { exchangeRate: Prisma.Decimal };

// Amounts are stored in their document currency; exchangeRate is locked at posting
// and converts to the tenant base currency. Sum base amounts only, never raw totals.
function toBase(amount: Prisma.Decimal, rate: LockedRate): number {
    return Number(amount) * Number(rate.exchangeRate);
}

@Injectable()
export class ReportsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly presenter: ReportsPresenter,
    ) {}

    async getStockBalance(tenantId: string, warehouseId?: string) {
        const where: any = { tenantId };
        if (warehouseId) where.warehouseId = warehouseId;
        const rows = await this.prisma.stockBalance.findMany({
            where,
            include: {
                item: { select: { code: true, name: true } },
                warehouse: { select: { code: true, name: true } },
            },
            orderBy: [{ warehouse: { code: 'asc' } }, { item: { code: 'asc' } }],
        });
        return this.presenter.toStockBalance(rows);
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

        const totalSales = invoices.reduce((s, i) => s + toBase(i.total, i), 0);
        return { invoices: this.presenter.toInvoiceSummary(invoices), totalSales, count: invoices.length };
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

        const totalPurchases = invoices.reduce((s, i) => s + toBase(i.total, i), 0);
        return { invoices: this.presenter.toInvoiceSummary(invoices), totalPurchases, count: invoices.length };
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

        return this.presenter.toPartyStatement({
            party,
            invoices,
            payments,
            totalInvoiced,
            totalPaid,
            balance,
        });
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

        const [salesInvoices, purchaseInvoices, expenses] = await Promise.all([
            this.prisma.invoice.findMany({ where: saleWhere, select: { total: true, exchangeRate: true } }),
            this.prisma.invoice.findMany({ where: purchaseWhere, select: { total: true, exchangeRate: true } }),
            this.prisma.expense.findMany({ where: expenseWhere, select: { totalAmount: true, exchangeRate: true } }),
        ]);

        const totalSales = salesInvoices.reduce((s, i) => s + toBase(i.total, i), 0);
        const totalPurchases = purchaseInvoices.reduce((s, i) => s + toBase(i.total, i), 0);
        const totalExpenses = expenses.reduce((s, e) => s + toBase(e.totalAmount, e), 0);
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
            salesInvoices, purchaseInvoices, expenses,
            cashboxes, lowStockCount,
            partiesCount, itemsCount,
        ] = await Promise.all([
            this.prisma.invoice.findMany({
                where: { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' }, date: dateFilter },
                select: { total: true, exchangeRate: true },
            }),
            this.prisma.invoice.findMany({
                where: { tenantId, status: 'POSTED', invoiceType: { direction: 'PURCHASE' }, date: dateFilter },
                select: { total: true, exchangeRate: true },
            }),
            this.prisma.expense.findMany({
                where: { tenantId, status: 'POSTED', date: dateFilter },
                select: { totalAmount: true, exchangeRate: true },
            }),
            this.prisma.cashbox.findMany({
                where: { tenantId, isActive: true },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    balance: true,
                    currency: { select: { code: true, symbol: true } },
                },
            }),
            this.prisma.stockBalance.count({ where: { tenantId, quantity: { lte: 0 } } }),
            this.prisma.party.count({ where: { tenantId, isActive: true } }),
            this.prisma.item.count({ where: { tenantId, isActive: true } }),
        ]);

        const totalSales = salesInvoices.reduce((s, i) => s + toBase(i.total, i), 0);
        const totalPurchases = purchaseInvoices.reduce((s, i) => s + toBase(i.total, i), 0);
        const totalExpenses = expenses.reduce((s, e) => s + toBase(e.totalAmount, e), 0);

        return {
            totalSales,
            totalPurchases,
            totalExpenses,
            netProfit: totalSales - totalPurchases - totalExpenses,
            cashboxes: this.presenter.toDashboardCashboxes(cashboxes),
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
                select: { date: true, total: true, exchangeRate: true },
                orderBy: { date: 'asc' },
            }),
            this.prisma.invoice.findMany({
                where: { tenantId, status: 'POSTED', invoiceType: { direction: 'PURCHASE' }, date: { gte: from, lte: cappedTo } },
                select: { date: true, total: true, exchangeRate: true },
                orderBy: { date: 'asc' },
            }),
        ]);

        const map = new Map<string, { sales: number; purchases: number }>();

        for (const inv of salesInvoices) {
            const key = inv.date.toISOString().slice(0, 10);
            const entry = map.get(key) ?? { sales: 0, purchases: 0 };
            entry.sales += toBase(inv.total, inv);
            map.set(key, entry);
        }

        for (const inv of purchaseInvoices) {
            const key = inv.date.toISOString().slice(0, 10);
            const entry = map.get(key) ?? { sales: 0, purchases: 0 };
            entry.purchases += toBase(inv.total, inv);
            map.set(key, entry);
        }

        return Array.from(map.entries())
            .map(([date, values]) => ({ date, ...values }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    async getDashboardExpenseBreakdown(tenantId: string, filters?: { from?: string; to?: string }) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const from = filters?.from ? new Date(filters.from) : startOfMonth;
        const to = filters?.to ? new Date(filters.to) : today;

        const expenseItems = await this.prisma.expenseItem.findMany({
            where: { tenantId, expense: { status: 'POSTED', date: { gte: from, lte: to } } },
            select: { accountId: true, amount: true, expense: { select: { exchangeRate: true } } },
        });

        const totalByAccount = new Map<string, number>();
        for (const item of expenseItems) {
            totalByAccount.set(item.accountId, (totalByAccount.get(item.accountId) ?? 0) + toBase(item.amount, item.expense));
        }

        const grouped = Array.from(totalByAccount.entries())
            .map(([accountId, total]) => ({ accountId, total }))
            .sort((a, b) => b.total - a.total);

        if (grouped.length === 0) {
            return [];
        }

        const TOP_N = 5;
        const top = grouped.slice(0, TOP_N);
        const rest = grouped.slice(TOP_N);

        const accounts = await this.prisma.chartOfAccount.findMany({
            where: { id: { in: top.map((g) => g.accountId) } },
            select: { id: true, name: true },
        });
        const accountById = new Map(accounts.map((a) => [a.id, a.name]));

        const result = top.map((g) => ({
            accountId: g.accountId,
            accountName: accountById.get(g.accountId) ?? null,
            total: g.total,
        }));

        if (rest.length > 0) {
            const otherTotal = rest.reduce((sum, g) => sum + g.total, 0);
            result.push({
                accountId: 'other',
                accountName: { en: 'Other', ar: 'أخرى' },
                total: otherTotal,
            });
        }

        return result;
    }

    async getDashboardTopItems(tenantId: string, filters?: { from?: string; to?: string; limit?: number }) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const from = filters?.from ? new Date(filters.from) : startOfMonth;
        const to = filters?.to ? new Date(filters.to) : today;
        const limit = filters?.limit ?? 5;

        const lines = await this.prisma.invoiceLine.findMany({
            where: {
                tenantId,
                invoice: { status: 'POSTED', invoiceType: { direction: 'SALE' }, date: { gte: from, lte: to } },
            },
            select: { itemId: true, quantity: true, total: true, invoice: { select: { exchangeRate: true } } },
        });

        const totalsByItem = new Map<string, { quantity: number; revenue: number }>();
        for (const line of lines) {
            const entry = totalsByItem.get(line.itemId) ?? { quantity: 0, revenue: 0 };
            entry.quantity += Number(line.quantity);
            entry.revenue += toBase(line.total, line.invoice);
            totalsByItem.set(line.itemId, entry);
        }

        const grouped = Array.from(totalsByItem.entries())
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, limit);

        if (grouped.length === 0) {
            return [];
        }

        const items = await this.prisma.item.findMany({
            where: { id: { in: grouped.map(([itemId]) => itemId) } },
            select: { id: true, name: true, code: true },
        });
        const itemById = new Map(items.map((i) => [i.id, i]));

        return grouped.map(([itemId, totals]) => {
            const item = itemById.get(itemId);
            return {
                itemId,
                itemName: item?.name ?? '',
                itemCode: item?.code ?? '',
                quantity: totals.quantity,
                revenue: totals.revenue,
            };
        });
    }
}
