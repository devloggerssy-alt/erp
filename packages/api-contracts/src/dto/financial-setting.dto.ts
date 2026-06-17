export interface UpsertFinancialSettingDto {
    defaultSalesAccountId?: string | null;
    defaultPurchaseAccountId?: string | null;
    defaultTaxAccountId?: string | null;
    defaultReceivableAccountId?: string | null;
    defaultPayableAccountId?: string | null;
}

export interface FinancialSettingResponseDto {
    id: string;
    tenantId: string;
    defaultSalesAccountId: string | null;
    defaultPurchaseAccountId: string | null;
    defaultTaxAccountId: string | null;
    defaultReceivableAccountId: string | null;
    defaultPayableAccountId: string | null;
    updatedAt: string;
}
