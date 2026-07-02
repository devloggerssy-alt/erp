export interface UpsertFinancialSettingDto {
    defaultSalesAccountId?: string | null;
    defaultPurchaseAccountId?: string | null;
    defaultTaxAccountId?: string | null;
    defaultReceivableAccountId?: string | null;
    defaultPayableAccountId?: string | null;
    defaultInventoryAccountId?: string | null;
    defaultCogsAccountId?: string | null;
    defaultInventoryAdjustmentAccountId?: string | null;
    defaultOpeningEquityAccountId?: string | null;
}

export interface FinancialSettingResponseDto {
    id: string;
    tenantId: string;
    defaultSalesAccountId: string | null;
    defaultPurchaseAccountId: string | null;
    defaultTaxAccountId: string | null;
    defaultReceivableAccountId: string | null;
    defaultPayableAccountId: string | null;
    defaultInventoryAccountId: string | null;
    defaultCogsAccountId: string | null;
    defaultInventoryAdjustmentAccountId: string | null;
    defaultOpeningEquityAccountId: string | null;
    updatedAt: string;
}
