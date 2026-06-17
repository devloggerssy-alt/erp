export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'CUSTOMER_SUPPLIER';

export interface CreatePartyDto {
    code?: string;
    name: string;
    type: PartyType;
    phone?: string;
    email?: string;
    address?: string;
    openingBalance?: number;
    /** Override the default AR account for this party (falls back to FinancialSetting.defaultReceivableAccountId). */
    receivableAccountId?: string | null;
    /** Override the default AP account for this party (falls back to FinancialSetting.defaultPayableAccountId). */
    payableAccountId?: string | null;
}

export interface UpdatePartyDto {
    code?: string;
    name?: string;
    type?: PartyType;
    phone?: string;
    email?: string;
    address?: string;
    openingBalance?: number;
    isActive?: boolean;
    receivableAccountId?: string | null;
    payableAccountId?: string | null;
}

export interface UpdatePartyStatusDto {
    isActive: boolean;
}
