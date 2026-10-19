import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Party, Payment, Prisma } from '@devloggers/db-prisma';

/** Loads for the report queries. The row types below derive from these, so presenters can't drift from the query. */
export const STOCK_BALANCE_REPORT_INCLUDE = {
    item: { select: { code: true, name: true } },
    warehouse: { select: { code: true, name: true } },
} satisfies Prisma.StockBalanceInclude;

export const INVOICE_SUMMARY_INCLUDE = {
    party: { select: { name: true, code: true } },
} satisfies Prisma.InvoiceInclude;

export const PARTY_STATEMENT_INVOICE_INCLUDE = {
    invoiceType: { select: { direction: true } },
    paymentAllocations: { select: { amount: true } },
} satisfies Prisma.InvoiceInclude;

export const DASHBOARD_CASHBOX_SELECT = {
    id: true,
    code: true,
    name: true,
    balance: true,
    currency: { select: { code: true, symbol: true } },
} satisfies Prisma.CashboxSelect;

const INVOICE_TOTAL_SELECT = {
    total: true,
    exchangeRate: true,
} satisfies Prisma.InvoiceSelect;

const EXPENSE_TOTAL_SELECT = {
    totalAmount: true,
    exchangeRate: true,
} satisfies Prisma.ExpenseSelect;

const INVOICE_DAILY_TOTAL_SELECT = {
    date: true,
    total: true,
    exchangeRate: true,
} satisfies Prisma.InvoiceSelect;

const EXPENSE_ITEM_AMOUNT_SELECT = {
    accountId: true,
    amount: true,
    expense: { select: { exchangeRate: true } },
} satisfies Prisma.ExpenseItemSelect;

const ACCOUNT_NAME_SELECT = {
    id: true,
    name: true,
} satisfies Prisma.ChartOfAccountSelect;

const SALES_LINE_SELECT = {
    itemId: true,
    quantity: true,
    total: true,
    invoice: { select: { exchangeRate: true } },
} satisfies Prisma.InvoiceLineSelect;

const ITEM_LOOKUP_SELECT = {
    id: true,
    name: true,
    code: true,
} satisfies Prisma.ItemSelect;

export type StockBalanceRow = Prisma.StockBalanceGetPayload<{ include: typeof STOCK_BALANCE_REPORT_INCLUDE }>;
export type InvoiceSummaryRow = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_SUMMARY_INCLUDE }>;
export type PartyStatementInvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof PARTY_STATEMENT_INVOICE_INCLUDE }>;
export type DashboardCashboxRow = Prisma.CashboxGetPayload<{ select: typeof DASHBOARD_CASHBOX_SELECT }>;
export type InvoiceTotalRow = Prisma.InvoiceGetPayload<{ select: typeof INVOICE_TOTAL_SELECT }>;
export type ExpenseTotalRow = Prisma.ExpenseGetPayload<{ select: typeof EXPENSE_TOTAL_SELECT }>;
export type InvoiceDailyTotalRow = Prisma.InvoiceGetPayload<{ select: typeof INVOICE_DAILY_TOTAL_SELECT }>;
export type ExpenseItemAmountRow = Prisma.ExpenseItemGetPayload<{ select: typeof EXPENSE_ITEM_AMOUNT_SELECT }>;
export type AccountNameRow = Prisma.ChartOfAccountGetPayload<{ select: typeof ACCOUNT_NAME_SELECT }>;
export type SalesLineRow = Prisma.InvoiceLineGetPayload<{ select: typeof SALES_LINE_SELECT }>;
export type ItemLookupRow = Prisma.ItemGetPayload<{ select: typeof ITEM_LOOKUP_SELECT }>;

export type InvoiceDirection = 'SALE' | 'PURCHASE';

export interface ReportFilters {
    from?: string;
    to?: string;
}

export interface InvoiceSummaryFilters extends ReportFilters {
    partyId?: string;
}

type DateRange = { gte?: Date; lte?: Date };

function dateRange(filters: ReportFilters): DateRange | undefined {
    if (!filters.from && !filters.to) return undefined;
    return {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
}

@Injectable()
export class ReportsRepository {
    constructor(private readonly prisma: PrismaService) {}

    findStockBalances(tenantId: string, warehouseId?: string): Promise<StockBalanceRow[]> {
        return this.prisma.stockBalance.findMany({
            where: { tenantId, ...(warehouseId ? { warehouseId } : {}) },
            include: STOCK_BALANCE_REPORT_INCLUDE,
            orderBy: [{ warehouse: { code: 'asc' } }, { item: { code: 'asc' } }],
        });
    }

    findInvoicesByDirection(
        direction: InvoiceDirection,
        tenantId: string,
        filters: InvoiceSummaryFilters,
    ): Promise<InvoiceSummaryRow[]> {
        const date = dateRange(filters);
        return this.prisma.invoice.findMany({
            where: {
                tenantId,
                status: 'POSTED',
                invoiceType: { direction },
                ...(filters.partyId ? { partyId: filters.partyId } : {}),
                ...(date ? { date } : {}),
            },
            include: INVOICE_SUMMARY_INCLUDE,
            orderBy: { date: 'desc' },
        });
    }

    findParty(tenantId: string, partyId: string): Promise<Party | null> {
        return this.prisma.party.findFirst({ where: { id: partyId, tenantId } });
    }

    findPartyStatementInvoices(tenantId: string, partyId: string): Promise<PartyStatementInvoiceRow[]> {
        return this.prisma.invoice.findMany({
            where: { tenantId, partyId, status: 'POSTED' },
            include: PARTY_STATEMENT_INVOICE_INCLUDE,
            orderBy: { date: 'asc' },
        });
    }

    findPartyStatementPayments(tenantId: string, partyId: string): Promise<Payment[]> {
        return this.prisma.payment.findMany({
            where: { tenantId, partyId, status: 'POSTED' },
            orderBy: { date: 'asc' },
        });
    }

    findInvoiceTotals(
        direction: InvoiceDirection,
        tenantId: string,
        filters: ReportFilters,
    ): Promise<InvoiceTotalRow[]> {
        const date = dateRange(filters);
        return this.prisma.invoice.findMany({
            where: {
                tenantId,
                status: 'POSTED',
                invoiceType: { direction },
                ...(date ? { date } : {}),
            },
            select: INVOICE_TOTAL_SELECT,
        });
    }

    findExpenseTotals(tenantId: string, filters: ReportFilters): Promise<ExpenseTotalRow[]> {
        const date = dateRange(filters);
        return this.prisma.expense.findMany({
            where: {
                tenantId,
                status: 'POSTED',
                ...(date ? { date } : {}),
            },
            select: EXPENSE_TOTAL_SELECT,
        });
    }

    findActiveCashboxes(tenantId: string): Promise<DashboardCashboxRow[]> {
        return this.prisma.cashbox.findMany({
            where: { tenantId, isActive: true },
            select: DASHBOARD_CASHBOX_SELECT,
        });
    }

    countLowStockBalances(tenantId: string): Promise<number> {
        return this.prisma.stockBalance.count({ where: { tenantId, quantity: { lte: 0 } } });
    }

    countActiveParties(tenantId: string): Promise<number> {
        return this.prisma.party.count({ where: { tenantId, isActive: true } });
    }

    countActiveItems(tenantId: string): Promise<number> {
        return this.prisma.item.count({ where: { tenantId, isActive: true } });
    }

    findDailyInvoiceTotals(
        direction: InvoiceDirection,
        tenantId: string,
        filters: ReportFilters,
    ): Promise<InvoiceDailyTotalRow[]> {
        const date = dateRange(filters);
        return this.prisma.invoice.findMany({
            where: {
                tenantId,
                status: 'POSTED',
                invoiceType: { direction },
                ...(date ? { date } : {}),
            },
            select: INVOICE_DAILY_TOTAL_SELECT,
            orderBy: { date: 'asc' },
        });
    }

    findPostedExpenseItems(tenantId: string, filters: ReportFilters): Promise<ExpenseItemAmountRow[]> {
        const date = dateRange(filters);
        return this.prisma.expenseItem.findMany({
            where: {
                tenantId,
                expense: {
                    status: 'POSTED',
                    ...(date ? { date } : {}),
                },
            },
            select: EXPENSE_ITEM_AMOUNT_SELECT,
        });
    }

    findAccountNames(accountIds: string[]): Promise<AccountNameRow[]> {
        return this.prisma.chartOfAccount.findMany({
            where: { id: { in: accountIds } },
            select: ACCOUNT_NAME_SELECT,
        });
    }

    findPostedSalesLines(tenantId: string, filters: ReportFilters): Promise<SalesLineRow[]> {
        const date = dateRange(filters);
        return this.prisma.invoiceLine.findMany({
            where: {
                tenantId,
                invoice: {
                    status: 'POSTED',
                    invoiceType: { direction: 'SALE' },
                    ...(date ? { date } : {}),
                },
            },
            select: SALES_LINE_SELECT,
        });
    }

    findItemsByIds(itemIds: string[]): Promise<ItemLookupRow[]> {
        return this.prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: ITEM_LOOKUP_SELECT,
        });
    }
}
