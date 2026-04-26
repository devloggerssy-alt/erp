export type InvoiceStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

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

export interface CreateInvoiceDto {
    invoiceTypeId: string;
    date: string;
    dueDate?: string;
    partyId: string;
    warehouseId?: string;
    fiscalPeriodId: string;
    currencyId: string;
    notes?: string;
    lines: InvoiceLineDto[];
}

export interface UpdateInvoiceDto {
    date?: string;
    dueDate?: string;
    partyId?: string;
    warehouseId?: string;
    currencyId?: string;
    notes?: string;
    lines?: InvoiceLineDto[];
}
