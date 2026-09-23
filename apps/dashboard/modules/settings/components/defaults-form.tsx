"use client"

import { useTranslations } from "next-intl"
import { tenantResource } from "@devloggers/api-contracts"
import { RhfResourceSelect } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
  defaultsSchema,
  DEFAULT_DEFAULTS_VALUES,
  mapSettingsToDefaultsValues,
  type DefaultsFormValues,
} from "../settings.config"

export function DefaultsForm() {
  const api = useApi()
  const t = useTranslations("business.settings.defaults")

  const ctrl = useSettingsSection<DefaultsFormValues>({
    schema: defaultsSchema,
    defaultValues: DEFAULT_DEFAULTS_VALUES,
    queryKey: [tenantResource.routes.settings, "defaults"],
    load: async () => mapSettingsToDefaultsValues(await api.tenants.getSettings()),
    submit: (values) =>
      api.tenants.updateSettings({
        defaultWarehouseId: values.defaultWarehouseId || null,
        defaultUnitId: values.defaultUnitId || null,
      }),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("failed") },
  })

  return (
    <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
      <RhfResourceSelect
        name="defaultWarehouseId"
        label={t("defaultWarehouse")}
        placeholder={t("defaultWarehousePlaceholder")}
        client={(api) => api.warehouses}
        getLabel={(it) => `${it.code} — ${it.name}`}
        disabled={ctrl.isBusy}
      />
      <RhfResourceSelect
        name="defaultUnitId"
        label={t("defaultUnit")}
        placeholder={t("defaultUnitPlaceholder")}
        client={(api) => api.units}
        getLabel={(it) => `${it.name} (${it.abbreviation})`}
        disabled={ctrl.isBusy}
      />
    </SettingsSectionCard>
  )
}
