import type { LocalizedString } from './i18n.dto';

export type PaymentType = 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT';

export interface CreateCashboxDto {
    code: string;
    name: LocalizedString;
    currencyId: string;
}

export interface UpdateCashboxDto {
    name?: LocalizedString;
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
    /** Exchange rate to tenant base currency. Defaults to 1 for base-currency payments. */
    exchangeRate?: number;
    notes?: string;
    /** If true, the payment is posted immediately after creation instead of staying DRAFT. */
    complete?: boolean;
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
