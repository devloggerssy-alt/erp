"use client"

import { useTranslations } from "next-intl"
import { financialSettingResource } from "@devloggers/api-contracts"
import type { AccountsClient } from "@devloggers/api-client"
import { RhfResourceSelect } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "@/shared/hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
    DEFAULT_GL_ACCOUNTS_VALUES,
    glAccountsSchema,
    mapToGlAccountsValues,
    toGlAccountsPayload,
    type GlAccountField,
    type GlAccountsFormValues,
} from "../gl-accounts.config"

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
        submit: (values) => api["financial-settings"].upsert(toGlAccountsPayload(values)),
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
            getLabel={(it) => `${it.code} — ${it.name}`}
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
            {accountSelect("defaultCashAccount", t("defaultCashAccount"))}
            {accountSelect("defaultBankAccount", t("defaultBankAccount"))}
        </SettingsSectionCard>
    )
}
