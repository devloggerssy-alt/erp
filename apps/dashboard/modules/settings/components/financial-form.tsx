"use client"

import { useTranslations } from "next-intl"
import { tenantResource } from "@devloggers/api-contracts"
import { RhfTextField, RhfResourceSelect } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
  financialSchema,
  DEFAULT_FINANCIAL_VALUES,
  mapToFinancialValues,
  type FinancialFormValues,
} from "../settings.config"

export function FinancialForm() {
  const api = useApi()
  const t = useTranslations("business.settings.financial")

  const ctrl = useSettingsSection<FinancialFormValues>({
    schema: financialSchema,
    defaultValues: DEFAULT_FINANCIAL_VALUES,
    queryKey: [tenantResource.routes.settings, "financial"],
    load: async () => {
      const [tenant, settings] = await Promise.all([api.tenants.current(), api.tenants.getSettings()])
      return mapToFinancialValues(tenant, settings)
    },
    submit: (values) =>
      Promise.all([
        api.tenants.updateCurrent({
          baseCurrencyId: values.baseCurrencyId || undefined,
        }),
        api.tenants.updateSettings({
          defaultTaxRate: values.defaultTaxRate,
          roundingPrecision: values.roundingPrecision,
          fiscalYearStartMonth: values.fiscalYearStartMonth,
        }),
      ]),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("failed") },
  })

  return (
    <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
      <RhfResourceSelect
        name="baseCurrencyId"
        label={t("baseCurrency")}
        disabled={ctrl.isBusy}
        client={(api) => api.currencies}
        getLabel={(item) => item.code}
        placeholder={t("baseCurrencyPlaceholder")}
      />
      <RhfTextField name="defaultTaxRate" label={t("defaultTaxRate")} type="number" disabled={ctrl.isBusy} />
      <RhfTextField name="roundingPrecision" label={t("roundingPrecision")} type="number" disabled={ctrl.isBusy} />
      <RhfTextField name="fiscalYearStartMonth" label={t("fiscalYearStartMonth")} type="number" disabled={ctrl.isBusy} />
    </SettingsSectionCard>
  )
}
