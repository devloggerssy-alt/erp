import { z } from "zod"
import type { ApiComponents, UpsertFinancialSettingDto } from "@devloggers/api-contracts"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const optionalAccount = z.object({ id: z.string() }).passthrough().nullable().optional()

export const glAccountsSchema = z.object({
    defaultSalesAccount: optionalAccount,
    defaultPurchaseAccount: optionalAccount,
    defaultTaxAccount: optionalAccount,
    defaultReceivableAccount: optionalAccount,
    defaultPayableAccount: optionalAccount,
    defaultCashAccount: optionalAccount,
    defaultBankAccount: optionalAccount,
})

export type GlAccountsFormValues = z.infer<typeof glAccountsSchema>
export type GlAccountField = { id: string }

type FinancialSettingResponse = ApiComponents["schemas"]["FinancialSettingResponseDto"]

export const DEFAULT_GL_ACCOUNTS_VALUES: GlAccountsFormValues = {
    defaultSalesAccount: null,
    defaultPurchaseAccount: null,
    defaultTaxAccount: null,
    defaultReceivableAccount: null,
    defaultPayableAccount: null,
    defaultCashAccount: null,
    defaultBankAccount: null,
}

export function mapToGlAccountsValues(data: unknown): GlAccountsFormValues {
    const d = unwrapApiData<FinancialSettingResponse>(data)
    return {
        defaultSalesAccount: d.defaultSalesAccountId ? { id: d.defaultSalesAccountId } : null,
        defaultPurchaseAccount: d.defaultPurchaseAccountId ? { id: d.defaultPurchaseAccountId } : null,
        defaultTaxAccount: d.defaultTaxAccountId ? { id: d.defaultTaxAccountId } : null,
        defaultReceivableAccount: d.defaultReceivableAccountId ? { id: d.defaultReceivableAccountId } : null,
        defaultPayableAccount: d.defaultPayableAccountId ? { id: d.defaultPayableAccountId } : null,
        defaultCashAccount: d.defaultCashAccountId ? { id: d.defaultCashAccountId } : null,
        defaultBankAccount: d.defaultBankAccountId ? { id: d.defaultBankAccountId } : null,
    }
}

export function toGlAccountsPayload(values: GlAccountsFormValues): UpsertFinancialSettingDto {
    return {
        defaultSalesAccountId: values.defaultSalesAccount?.id ?? null,
        defaultPurchaseAccountId: values.defaultPurchaseAccount?.id ?? null,
        defaultTaxAccountId: values.defaultTaxAccount?.id ?? null,
        defaultReceivableAccountId: values.defaultReceivableAccount?.id ?? null,
        defaultPayableAccountId: values.defaultPayableAccount?.id ?? null,
        defaultCashAccountId: values.defaultCashAccount?.id ?? null,
        defaultBankAccountId: values.defaultBankAccount?.id ?? null,
    }
}
