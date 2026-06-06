import type { LocalizedString } from './i18n.dto';

// Chart of Accounts
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface CreateChartOfAccountDto {
    code: string;
    name: LocalizedString;
    type: AccountType;
    parentId?: string;
}

export interface UpdateChartOfAccountDto {
    name?: LocalizedString;
    parentId?: string | null;
    isActive?: boolean;
}
