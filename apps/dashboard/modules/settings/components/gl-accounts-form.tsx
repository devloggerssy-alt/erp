"use client"

import { useTranslations } from "next-intl"
import { z } from "zod"
import { financialSettingResource } from "@devloggers/api-contracts"
import type { AccountsClient } from "@devloggers/api-client"
import { RhfResourceSelect } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

// ── Schema & types ──────────────────────────────────────────────────────────

const optionalAccount = z.object({ id: z.string() }).passthrough().nullable().optional()

export const glAccountsSchema = z.object({
    defaultSalesAccount: optionalAccount,
    defaultPurchaseAccount: optionalAccount,
    defaultTaxAccount: optionalAccount,
    defaultReceivableAccount: optionalAccount,
    defaultPayableAccount: optionalAccount,
})

export type GlAccountsFormValues = z.infer<typeof glAccountsSchema>
export type GlAccountField = { id: string }

export const DEFAULT_GL_ACCOUNTS_VALUES: GlAccountsFormValues = {
    defaultSalesAccount: null,
    defaultPurchaseAccount: null,
    defaultTaxAccount: null,
    defaultReceivableAccount: null,
    defaultPayableAccount: null,
}

function mapToGlAccountsValues(data: unknown): GlAccountsFormValues {
    const d = unwrapApiData<{
        defaultSalesAccountId?: string | null
        defaultPurchaseAccountId?: string | null
        defaultTaxAccountId?: string | null
        defaultReceivableAccountId?: string | null
        defaultPayableAccountId?: string | null
    }>(data)
    return {
        defaultSalesAccount: d?.defaultSalesAccountId ? { id: d.defaultSalesAccountId } : null,
        defaultPurchaseAccount: d?.defaultPurchaseAccountId ? { id: d.defaultPurchaseAccountId } : null,
        defaultTaxAccount: d?.defaultTaxAccountId ? { id: d.defaultTaxAccountId } : null,
        defaultReceivableAccount: d?.defaultReceivableAccountId ? { id: d.defaultReceivableAccountId } : null,
        defaultPayableAccount: d?.defaultPayableAccountId ? { id: d.defaultPayableAccountId } : null,
    }
}

// ── Component ───────────────────────────────────────────────────────────────

export function GlAccountsForm() {
    const api = useApi()
    const t = useTranslations("business.settings.glAccounts")

    const ctrl = useSettingsSection<GlAccountsFormValues>({
        schema: glAccountsSchema,
        defaultValues: DEFAULT_GL_ACCOUNTS_VALUES,
        queryKey: [financialSettingResource.key],
        load: async () => {
            const result = await api["financial-settings"].get()
            return mapToGlAccountsValues(result)
        },
        submit: (values) =>
            api["financial-settings"].upsert({
                defaultSalesAccountId: values.defaultSalesAccount?.id ?? null,
                defaultPurchaseAccountId: values.defaultPurchaseAccount?.id ?? null,
                defaultTaxAccountId: values.defaultTaxAccount?.id ?? null,
                defaultReceivableAccountId: values.defaultReceivableAccount?.id ?? null,
                defaultPayableAccountId: values.defaultPayableAccount?.id ?? null,
            }),
        messages: {
            saving: t("saving"),
            saved: t("saved"),
            failed: t("failed"),
        },
    })

    const accountSelect = (name: keyof GlAccountsFormValues, label: string) => (
        <RhfResourceSelect<GlAccountsFormValues, typeof name, AccountsClient, GlAccountField>
            name={name}
            label={label}
            client={(a) => a["chart-of-accounts"]}
            getLabel={(it) => `${(it as any).code} — ${(it as any).name}`}
            getValue={(it) => it}
            disabled={ctrl.isBusy}
        />
    )

    return (
        <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
            {accountSelect("defaultSalesAccount", t("defaultSalesAccount"))}
            {accountSelect("defaultPurchaseAccount", t("defaultPurchaseAccount"))}
            {accountSelect("defaultTaxAccount", t("defaultTaxAccount"))}
            {accountSelect("defaultReceivableAccount", t("defaultReceivableAccount"))}
            {accountSelect("defaultPayableAccount", t("defaultPayableAccount"))}
        </SettingsSectionCard>
    )
}
