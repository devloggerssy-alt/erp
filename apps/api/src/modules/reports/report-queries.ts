import type { Prisma } from '@devloggers/db-prisma';

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

export type StockBalanceRow = Prisma.StockBalanceGetPayload<{ include: typeof STOCK_BALANCE_REPORT_INCLUDE }>;
export type InvoiceSummaryRow = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_SUMMARY_INCLUDE }>;
export type PartyStatementInvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof PARTY_STATEMENT_INVOICE_INCLUDE }>;
export type DashboardCashboxRow = Prisma.CashboxGetPayload<{ select: typeof DASHBOARD_CASHBOX_SELECT }>;
