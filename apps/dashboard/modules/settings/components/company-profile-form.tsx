"use client"

import { useTranslations } from "next-intl"
import { tenantResource } from "@devloggers/api-contracts"
import { RhfTextField } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
  profileSchema,
  DEFAULT_PROFILE_VALUES,
  mapTenantToProfileValues,
  type ProfileFormValues,
} from "../settings.config"

export function CompanyProfileForm() {
  const api = useApi()
  const t = useTranslations("business.settings.profile")

  const ctrl = useSettingsSection<ProfileFormValues>({
    schema: profileSchema,
    defaultValues: DEFAULT_PROFILE_VALUES,
    queryKey: [tenantResource.routes.current],
    load: async () => mapTenantToProfileValues(await api.tenants.current()),
    submit: (values) =>
      api.tenants.updateCurrent({
        name: values.name,
        legalName: values.legalName || undefined,
        taxNumber: values.taxNumber || undefined,
        website: values.website || undefined,
        address: values.address || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        logo: values.logo || undefined,
      }),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("failed") },
  })

  return (
    <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
      <RhfTextField name="name" label={t("name")} required disabled={ctrl.isBusy} />
      <RhfTextField name="legalName" label={t("legalName")} disabled={ctrl.isBusy} />
      <RhfTextField name="taxNumber" label={t("taxNumber")} disabled={ctrl.isBusy} />
      <RhfTextField name="website" label={t("website")} disabled={ctrl.isBusy} />
      <RhfTextField name="address" label={t("address")} disabled={ctrl.isBusy} />
      <RhfTextField name="phone" label={t("phone")} disabled={ctrl.isBusy} />
      <RhfTextField name="email" label={t("email")} type="email" disabled={ctrl.isBusy} />
      <RhfTextField name="logo" label={t("logo")} description={t("logoHint")} disabled={ctrl.isBusy} />
    </SettingsSectionCard>
  )
}
