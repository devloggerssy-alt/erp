import Link from "next/link"
import { PackageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations } from "next-intl"
import type { DashboardSummaryResponse } from "@devloggers/api-client"

interface DashboardItemsOverviewProps {
    data: DashboardSummaryResponse | undefined
    isLoading: boolean
}

export function DashboardItemsOverview({ data, isLoading }: DashboardItemsOverviewProps) {
    const t = useTranslations("business.dashboard.itemsOverview")

    const stats = [
        {
            label: t("active"),
            value: data?.totalActiveItems ?? 0,
            href: "/catalog/items",
            colorClass: "text-emerald-600",
        },
        {
            label: t("total"),
            value: data?.totalActiveParties ?? 0,
            href: "/parties/customers",
            colorClass: "text-blue-600",
        },
        {
            label: t("outOfStock"),
            value: data?.lowStockItemsCount ?? 0,
            href: "/inventory/stock-balances",
            colorClass: "text-red-600",
        },
    ]

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PackageIcon className="h-4 w-4 text-indigo-500" />
                    {t("title")}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="space-y-4">
                    {stats.map((stat) => (
                        <Link
                            key={stat.label}
                            href={stat.href}
                            className="flex items-center justify-between group"
                        >
                            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                {stat.label}
                            </span>
                            {isLoading ? (
                                <Skeleton className="h-6 w-16" />
                            ) : (
                                <span className={`text-lg font-bold ${stat.colorClass}`}>
                                    {stat.value.toLocaleString()}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
