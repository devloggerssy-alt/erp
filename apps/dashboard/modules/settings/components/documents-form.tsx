"use client"

import { useTranslations } from "next-intl"
import { tenantResource } from "@devloggers/api-contracts"
import { RhfTextareaField, RhfCheckboxField } from "@/shared/components/form"
import { useApi } from "@/shared/useApi"
import { useSettingsSection } from "../hooks/use-settings-section"
import { SettingsSectionCard } from "./settings-section-card"
import {
  documentsSchema,
  DEFAULT_DOCUMENTS_VALUES,
  mapSettingsToDocumentsValues,
  type DocumentsFormValues,
} from "../settings.config"

export function DocumentsForm() {
  const api = useApi()
  const t = useTranslations("business.settings.documents")

  const ctrl = useSettingsSection<DocumentsFormValues>({
    schema: documentsSchema,
    defaultValues: DEFAULT_DOCUMENTS_VALUES,
    queryKey: [tenantResource.routes.settings, "documents"],
    load: async () => mapSettingsToDocumentsValues(await api.tenants.getSettings()),
    submit: (values) => api.tenants.updateSettings({ ...values }),
    messages: { saving: t("saving"), saved: t("saved"), failed: t("failed") },
  })

  return (
    <SettingsSectionCard ctrl={ctrl} title={t("title")} description={t("description")}>
      <RhfTextareaField name="invoiceDefaultNotes" label={t("invoiceDefaultNotes")} disabled={ctrl.isBusy} />
      <RhfTextareaField name="invoiceDefaultTerms" label={t("invoiceDefaultTerms")} disabled={ctrl.isBusy} />
      <RhfTextareaField name="documentFooter" label={t("documentFooter")} disabled={ctrl.isBusy} />
      <RhfCheckboxField name="showLogoOnDocuments" label={t("showLogoOnDocuments")} disabled={ctrl.isBusy} />
    </SettingsSectionCard>
  )
}
