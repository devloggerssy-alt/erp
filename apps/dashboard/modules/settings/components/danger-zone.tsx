"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { useApi } from "@/shared/useApi"
import { usePermissions } from "@/shared/hooks/use-permissions"
import { useAuth } from "@/shared/hooks/use-auth"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { DangerZoneCard, type DangerZoneCardLabels } from "./danger-zone-card"

const FINANCE_CONFIRM_PHRASE = "RESET FINANCE"
const INVENTORY_CONFIRM_PHRASE = "RESET INVENTORY"
const IMPORT_DATABASE_CONFIRM_PHRASE = "IMPORT DATABASE"

export function DangerZone() {
  const api = useApi()
  const router = useRouter()
  const locale = useLocale()
  const { logout } = useAuth()
  const t = useTranslations("business.settings.danger")
  const { can } = usePermissions()
  const [importFile, setImportFile] = useState<File | null>(null)

  if (!can("danger.reset")) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-medium text-destructive">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("noAccess")}</p>
      </div>
    )
  }

  const labels = (key: "finance" | "inventory" | "importDatabase", phrase: string): DangerZoneCardLabels => ({
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

      {can("danger.export") && (
        <Card>
          <CardHeader>
            <CardTitle>{t("exportDatabase.title")}</CardTitle>
            <CardDescription>{t("exportDatabase.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                toast.promise(api.tenants.exportDatabase(), {
                  loading: t("exportDatabase.running"),
                  success: t("exportDatabase.success"),
                  error: t("exportDatabase.failed"),
                })
              }}
            >
              <Download />
              {t("exportDatabase.action")}
            </Button>
          </CardContent>
        </Card>
      )}

      {can("danger.import") && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-database-file">{t("importDatabase.filePickerLabel")}</Label>
            <Input
              id="import-database-file"
              type="file"
              accept=".gz"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <DangerZoneCard
            title={t("importDatabase.title")}
            description={t("importDatabase.description")}
            warningItems={[
              t("importDatabase.item_allData"),
              t("importDatabase.item_users"),
              t("importDatabase.item_logout"),
            ]}
            confirmPhrase={IMPORT_DATABASE_CONFIRM_PHRASE}
            disabled={!importFile}
            onConfirm={async () => {
              if (!importFile) throw new Error(t("importDatabase.noFileSelected"))
              const result = await api.tenants.importDatabase(importFile, IMPORT_DATABASE_CONFIRM_PHRASE)
              await logout()
              router.push(`/${locale}/login`)
              return result
            }}
            labels={labels("importDatabase", IMPORT_DATABASE_CONFIRM_PHRASE)}
          />
        </div>
      )}

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
