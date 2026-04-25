// Chart of Accounts
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface CreateChartOfAccountDto {
    code: string;
    name: string;
    type: AccountType;
    parentId?: string;
}

export interface UpdateChartOfAccountDto {
    name?: string;
    parentId?: string | null;
    isActive?: boolean;
}
