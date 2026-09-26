"use client"

import { useMutation } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { useApi } from "@/shared/useApi"

// Mirrors apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-template.ts
// (level 1 + level 2 only) so the preview matches what onboarding actually creates.
const COA_PREVIEW = [
    {
        code: "1000", nameEn: "Assets", nameAr: "الأصول",
        children: [
            { code: "1100", nameEn: "Current Assets", nameAr: "الأصول المتداولة" },
            { code: "1200", nameEn: "Non-Current Assets", nameAr: "الأصول غير المتداولة" },
        ],
    },
    {
        code: "2000", nameEn: "Liabilities", nameAr: "الالتزامات",
        children: [
            { code: "2100", nameEn: "Current Liabilities", nameAr: "الالتزامات المتداولة" },
            { code: "2200", nameEn: "Non-Current Liabilities", nameAr: "الالتزامات غير المتداولة" },
        ],
    },
    {
        code: "3000", nameEn: "Equity", nameAr: "حقوق الملكية",
        children: [
            { code: "3100", nameEn: "Owner's Equity", nameAr: "حقوق صاحب العمل" },
            { code: "3200", nameEn: "Retained Earnings", nameAr: "الأرباح المحتجزة" },
        ],
    },
    {
        code: "4000", nameEn: "Revenue", nameAr: "الإيرادات",
        children: [
            { code: "4100", nameEn: "Sales Revenue", nameAr: "إيرادات المبيعات" },
            { code: "4200", nameEn: "Other Revenue", nameAr: "إيرادات أخرى" },
        ],
    },
    {
        code: "5000", nameEn: "Cost of Sales", nameAr: "تكلفة المبيعات",
        children: [
            { code: "5100", nameEn: "Cost of Goods Sold", nameAr: "تكلفة البضاعة المباعة" },
        ],
    },
    {
        code: "6000", nameEn: "Expenses", nameAr: "المصروفات",
        children: [
            { code: "6100", nameEn: "Operating Expenses", nameAr: "المصروفات التشغيلية" },
            { code: "6200", nameEn: "Administrative Expenses", nameAr: "المصروفات الإدارية" },
        ],
    },
]

type Props = { onSuccess: (codeToId: Record<string, string>) => void }

export function ChartOfAccountsStep({ onSuccess }: Props) {
    const api = useApi()
    const locale = useLocale()
    const t = useTranslations("business")
    const groupName = (group: { nameEn: string; nameAr: string }) => (locale === "ar" ? group.nameAr : group.nameEn)
    const { mutate, isPending, error } = useMutation({
        mutationFn: () => api.onboarding.stepChartOfAccounts(),
        onSuccess: (data) => onSuccess(data.codeToId),
    })

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                {t("onboarding.chartOfAccounts.description")}
            </p>

            <div className="border rounded-lg divide-y">
                {COA_PREVIEW.map((group) => (
                    <div key={group.code} className="p-3 space-y-1">
                        <div className="font-medium text-sm">{group.code} — {groupName(group)}</div>
                        <div className="ps-4 space-y-0.5">
                            {group.children.map((child) => (
                                <div key={child.code} className="text-xs text-muted-foreground">
                                    {child.code} {groupName(child)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {error && <p className="text-sm text-destructive">{error.message}</p>}

            <Button onClick={() => mutate()} disabled={isPending} className="w-full">
                {isPending ? t("onboarding.chartOfAccounts.creating") : t("onboarding.chartOfAccounts.confirm")}
            </Button>
        </div>
    )
}
