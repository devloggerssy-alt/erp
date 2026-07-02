export type InvoiceStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type InvoicePaidStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface InvoiceLineDto {
    itemId: string;
    unitId: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxPercent?: number;
    notes?: string;
    sortOrder?: number;
}

export interface CreateInvoiceOpeningPaymentDto {
    cashboxId: string;
    amount: number;
    /** Exchange rate to tenant base currency. Defaults to the invoice's exchange rate. */
    exchangeRate?: number;
}

export interface CreateInvoiceDto {
    invoiceTypeId: string;
    date: string;
    dueDate?: string;
    partyId: string;
    warehouseId?: string;
    fiscalPeriodId: string;
    currencyId: string;
    /** Exchange rate to tenant base currency. Defaults to 1 for base-currency invoices. */
    exchangeRate?: number;
    notes?: string;
    /** If true, the invoice is posted immediately after creation instead of staying DRAFT. */
    complete?: boolean;
    /** Optional opening payment recorded against this invoice at creation time. */
    openingPayment?: CreateInvoiceOpeningPaymentDto;
    lines: InvoiceLineDto[];
}

export interface UpdateInvoiceDto {
    date?: string;
    dueDate?: string;
    partyId?: string;
    warehouseId?: string;
    currencyId?: string;
    exchangeRate?: number;
    notes?: string;
    lines?: InvoiceLineDto[];
}

export interface AddInvoicePaymentDto {
    cashboxId: string;
    amount: number;
    date: string;
    /** Exchange rate to tenant base currency. Defaults to the invoice's exchange rate. */
    exchangeRate?: number;
}
