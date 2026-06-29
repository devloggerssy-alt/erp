import { WalletIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations, useLocale } from "next-intl"
import type { DashboardCashbox } from "@devloggers/api-client"

const BORDER_COLORS = [
    "border-s-emerald-500",
    "border-s-blue-500",
    "border-s-violet-500",
    "border-s-amber-500",
    "border-s-rose-500",
    "border-s-cyan-500",
]

function getLocalizedName(
    name: Record<string, string> | unknown,
    locale: string,
): string {
    if (typeof name === "string") return name
    if (name && typeof name === "object") {
        const n = name as Record<string, string>
        return n[locale] ?? n["ar"] ?? n["en"] ?? ""
    }
    return ""
}

interface DashboardCashboxCardsProps {
    cashboxes: DashboardCashbox[]
    isLoading: boolean
}

export function DashboardCashboxCards({
    cashboxes,
    isLoading,
}: DashboardCashboxCardsProps) {
    const t = useTranslations("business.dashboard.cashboxes")
    const locale = useLocale()

    return (
        <div>
            <h2 className="text-lg font-semibold mb-3">{t("title")}</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
                {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-28 w-48 shrink-0 rounded-lg" />
                      ))
                    : cashboxes.map((cashbox, i) => (
                          <Card
                              key={cashbox.id}
                              className={`shrink-0 w-52 border-s-4 ${BORDER_COLORS[i % BORDER_COLORS.length]}`}
                          >
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
                                  <CardTitle className="text-sm font-medium truncate">
                                      {getLocalizedName(cashbox.name, locale)}
                                  </CardTitle>
                                  <WalletIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              </CardHeader>
                              <CardContent className="pb-4">
                                  <div className="text-xl font-bold">
                                      {cashbox.currency.symbol}{" "}
                                      {new Intl.NumberFormat(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                      }).format(Number(cashbox.balance))}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                      {cashbox.currency.code} · {t("balance")}
                                  </p>
                              </CardContent>
                          </Card>
                      ))}
            </div>
        </div>
    )
}
