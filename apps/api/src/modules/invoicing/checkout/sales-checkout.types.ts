export interface SalesCheckoutLine {
    itemId: string;
    unitId: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
}

export interface SalesCheckoutIntent {
    tenantId: string;
    userId: string;
    /** Idempotency key — a repeat call with the same value replays the prior sale. */
    clientRequestId: string;
    invoiceTypeId: string;
    partyId: string;
    warehouseId: string;
    cashboxId: string;
    lines: SalesCheckoutLine[];
    notes?: string | null;
    /** When set, checkout fails (400, no writes) if the computed total exceeds it. */
    minimumTender?: number;
}

export interface SalesCheckoutResult {
    invoiceId: string;
    invoiceNumber: string;
    paymentId: string;
    paymentNumber: string;
    total: number;
    date: Date;
    replayed: boolean;
}
