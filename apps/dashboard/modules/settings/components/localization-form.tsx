"use client"

import { useTranslations } from "next-intl"
import { tenantResource } from "@devloggers/api-contracts"
import { RhfTextField, RhfSelectField } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
  localizationSchema,
  DEFAULT_LOCALIZATION_VALUES,
  mapSettingsToLocalizationValues,
  type LocalizationFormValues,
} from "../settings.config"

export function LocalizationForm() {
  const api = useApi()
  const t = useTranslations("business.settings.localization")

  const ctrl = useSettingsSection<LocalizationFormValues>({
    schema: localizationSchema,
    defaultValues: DEFAULT_LOCALIZATION_VALUES,
    queryKey: [tenantResource.routes.settings, "localization"],
    load: async () => mapSettingsToLocalizationValues(await api.tenants.getSettings()),
    submit: (values) => api.tenants.updateSettings({ ...values }),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("failed") },
  })

  return (
    <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
      <RhfTextField name="timezone" label={t("timezone")} required disabled={ctrl.isBusy} />
      <RhfSelectField
        name="locale"
        label={t("locale")}
        disabled={ctrl.isBusy}
        options={[
          { value: "en", label: t("locale_en") },
          { value: "ar", label: t("locale_ar") },
          { value: "tr", label: t("locale_tr") },
        ]}
      />
      <RhfSelectField
        name="dateFormat"
        label={t("dateFormat")}
        disabled={ctrl.isBusy}
        options={[
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
        ]}
      />
      <RhfSelectField
        name="numberFormat"
        label={t("numberFormat")}
        disabled={ctrl.isBusy}
        options={[
          { value: "1,234.56", label: "1,234.56" },
          { value: "1.234,56", label: "1.234,56" },
        ]}
      />
      <RhfSelectField
        // firstDayOfWeek is z.coerce.number() — select stores a string value that
        // zod coerces to number on submit; cast name to bypass the string/number
        // field-path type mismatch (RHF generic friction).
        name={"firstDayOfWeek" as keyof LocalizationFormValues & string}
        label={t("firstDayOfWeek")}
        disabled={ctrl.isBusy}
        options={[
          { value: "0", label: t("day_0") },
          { value: "1", label: t("day_1") },
          { value: "6", label: t("day_6") },
        ]}
      />
    </SettingsSectionCard>
  )
}
