export const INVOICES = {
    ROOT: "invoices",
    BY_ID: "invoices/:id",
    POST: "invoices/:id/post",
    CANCEL: "invoices/:id/cancel",
    PURCHASE: "purchase-invoices",
    SALES: "sales-invoices",
} as const;
