"use client"

import { useTranslations } from "next-intl"
import { useApi } from "@/shared/useApi"
import { DangerZoneCard, type DangerZoneCardLabels } from "./danger-zone-card"

const FINANCE_CONFIRM_PHRASE = "RESET FINANCE"
const INVENTORY_CONFIRM_PHRASE = "RESET INVENTORY"

export function DangerZone() {
  const api = useApi()
  const t = useTranslations("business.settings.danger")

  const labels = (key: "finance" | "inventory", phrase: string): DangerZoneCardLabels => ({
    dialogTitle: t(`${key}.dialogTitle`),
    dialogDescription: t(`${key}.dialogDescription`),
    confirmPrompt: t("confirmPrompt", { phrase }),
    actionLabel: t(`${key}.action`),
    cancelLabel: t("cancel"),
    running: t(`${key}.running`),
    success: t(`${key}.success`),
    failed: t(`${key}.failed`),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-medium text-destructive">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <DangerZoneCard
        title={t("finance.title")}
        description={t("finance.description")}
        warningItems={[
          t("finance.item_payments"),
          t("finance.item_invoices"),
          t("finance.item_expenses"),
          t("finance.item_journal"),
          t("finance.item_balances"),
        ]}
        confirmPhrase={FINANCE_CONFIRM_PHRASE}
        onConfirm={() => api.tenants.resetFinance({ confirmation: FINANCE_CONFIRM_PHRASE })}
        labels={labels("finance", FINANCE_CONFIRM_PHRASE)}
      />

      <DangerZoneCard
        title={t("inventory.title")}
        description={t("inventory.description")}
        warningItems={[
          t("inventory.item_movements"),
          t("inventory.item_counts"),
          t("inventory.item_balances"),
        ]}
        confirmPhrase={INVENTORY_CONFIRM_PHRASE}
        onConfirm={() => api.tenants.resetInventory({ confirmation: INVENTORY_CONFIRM_PHRASE })}
        labels={labels("inventory", INVENTORY_CONFIRM_PHRASE)}
      />
    </div>
  )
}
