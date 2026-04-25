export const ACCOUNTING = {
    CHART_OF_ACCOUNTS: "chart-of-accounts",
    COA_BY_ID: "chart-of-accounts/:id",
    JOURNAL_ENTRIES: "journal-entries",
    JOURNAL_BY_ID: "journal-entries/:id",
} as const;

export const STOCK_COUNTS = {
    ROOT: "stock-counts",
    BY_ID: "stock-counts/:id",
    POST: "stock-counts/:id/post",
} as const;

export const REPORTS = {
    STOCK_BALANCE: "reports/stock-balance",
    ITEM_MOVEMENT: "reports/item-movement",
    SALES_SUMMARY: "reports/sales-summary",
    PURCHASE_SUMMARY: "reports/purchase-summary",
    CUSTOMER_STATEMENT: "reports/customer-statement",
    SUPPLIER_STATEMENT: "reports/supplier-statement",
    PROFIT_SUMMARY: "reports/profit-summary",
    DASHBOARD: "dashboard/summary",
} as const;

export const AI_CHAT = {
    SESSIONS: "ai/sessions",
    SESSION_BY_ID: "ai/sessions/:id",
    MESSAGES: "ai/sessions/:id/messages",
} as const;

export const AUDIT = {
    LOGS: "audit-logs",
} as const;
