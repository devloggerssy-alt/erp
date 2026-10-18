import { Injectable } from '@nestjs/common';
import type { Prisma } from '@devloggers/db-prisma';
import { computeInvoicePaidState } from '../invoicing';
import { ReportsPresenter } from './presenters/reports.presenter';
import { ReportsRepository } from './repositories/reports.repository';

type LockedRate = { exchangeRate: Prisma.Decimal };

// Amounts are stored in their document currency; exchangeRate is locked at posting
// and converts to the tenant base currency. Sum base amounts only, never raw totals.
function toBase(amount: Prisma.Decimal, rate: LockedRate): number {
    return Number(amount) * Number(rate.exchangeRate);
}

@Injectable()
export class ReportsService {
    constructor(
        private readonly repository: ReportsRepository,
        private readonly presenter: ReportsPresenter,
    ) {}

    async getStockBalance(tenantId: string, warehouseId?: string) {
        const rows = await this.repository.findStockBalances(tenantId, warehouseId);
        return this.presenter.toStockBalance(rows);
    }

    async getSalesSummary(tenantId: string, filters: { from?: string; to?: string; partyId?: string }) {
        const invoices = await this.repository.findInvoicesByDirection('SALE', tenantId, filters);

        const totalSales = invoices.reduce((s, i) => s + toBase(i.total, i), 0);
        return { invoices: this.presenter.toInvoiceSummary(invoices), totalSales, count: invoices.length };
    }

    async getPurchaseSummary(tenantId: string, filters: { from?: string; to?: string; partyId?: string }) {
        const invoices = await this.repository.findInvoicesByDirection('PURCHASE', tenantId, filters);

        const totalPurchases = invoices.reduce((s, i) => s + toBase(i.total, i), 0);
        return { invoices: this.presenter.toInvoiceSummary(invoices), totalPurchases, count: invoices.length };
    }

    async getPartyStatement(tenantId: string, partyId: string) {
        const [party, invoices, payments] = await Promise.all([
            this.repository.findParty(tenantId, partyId),
            this.repository.findPartyStatementInvoices(tenantId, partyId),
            this.repository.findPartyStatementPayments(tenantId, partyId),
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
        const [salesInvoices, purchaseInvoices, expenses] = await Promise.all([
            this.repository.findInvoiceTotals('SALE', tenantId, filters),
            this.repository.findInvoiceTotals('PURCHASE', tenantId, filters),
            this.repository.findExpenseTotals(tenantId, filters),
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
        const range = { from: from.toISOString(), to: to.toISOString() };

        const [
            salesInvoices, purchaseInvoices, expenses,
            cashboxes, lowStockCount,
            partiesCount, itemsCount,
        ] = await Promise.all([
            this.repository.findInvoiceTotals('SALE', tenantId, range),
            this.repository.findInvoiceTotals('PURCHASE', tenantId, range),
            this.repository.findExpenseTotals(tenantId, range),
            this.repository.findActiveCashboxes(tenantId),
            this.repository.countLowStockBalances(tenantId),
            this.repository.countActiveParties(tenantId),
            this.repository.countActiveItems(tenantId),
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
        const range = { from: from.toISOString(), to: cappedTo.toISOString() };

        const [salesInvoices, purchaseInvoices] = await Promise.all([
            this.repository.findDailyInvoiceTotals('SALE', tenantId, range),
            this.repository.findDailyInvoiceTotals('PURCHASE', tenantId, range),
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
        const range = { from: from.toISOString(), to: to.toISOString() };

        const expenseItems = await this.repository.findPostedExpenseItems(tenantId, range);

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

        const accounts = await this.repository.findAccountNames(top.map((g) => g.accountId));
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
        const range = { from: from.toISOString(), to: to.toISOString() };
        const limit = filters?.limit ?? 5;

        const lines = await this.repository.findPostedSalesLines(tenantId, range);

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

        const items = await this.repository.findItemsByIds(grouped.map(([itemId]) => itemId));
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
