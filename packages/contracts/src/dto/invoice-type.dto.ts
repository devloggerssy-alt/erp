export type InvoiceDirection = 'PURCHASE' | 'SALE';

export interface CreateInvoiceTypeDto {
    code: string;
    name: string;
    direction: InvoiceDirection;
    affectsStock?: boolean;
}

export interface UpdateInvoiceTypeDto {
    name?: string;
    affectsStock?: boolean;
    isActive?: boolean;
}
