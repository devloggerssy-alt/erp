import type { LocalizedString } from './i18n.dto';

export interface CreateBankAccountDto {
    code?: string;
    name: LocalizedString;
    currencyId: string;
    accountNumber?: string | null;
    bankName?: string | null;
}

export interface UpdateBankAccountDto {
    name?: LocalizedString;
    accountNumber?: string | null;
    bankName?: string | null;
    isActive?: boolean;
}

export interface BankAccountResponseDto {
    id: string;
    code: string;
    name: string;
    nameI18n: LocalizedString;
    currencyId: string;
    accountNumber: string | null;
    bankName: string | null;
    balance: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
