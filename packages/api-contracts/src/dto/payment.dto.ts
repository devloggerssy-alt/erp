export type PaymentType = 'RECEIPT' | 'PAYMENT' | 'EXPENSE' | 'ADJUSTMENT';

export interface CreateCashboxDto {
    code: string;
    name: string;
    currencyId: string;
}

export interface UpdateCashboxDto {
    name?: string;
    isActive?: boolean;
}

export interface CreatePaymentDto {
    type: PaymentType;
    date: string;
    cashboxId: string;
    partyId?: string;
    currencyId: string;
    fiscalPeriodId: string;
    amount: number;
    notes?: string;
}

export interface UpdatePaymentDto {
    date?: string;
    cashboxId?: string;
    partyId?: string;
    amount?: number;
    notes?: string;
}

export interface AllocatePaymentDto {
    invoiceId: string;
    amount: number;
}
