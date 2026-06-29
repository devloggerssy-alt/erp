import {
    TrendingUp,
    ShoppingCart,
    LineChart,
    CreditCard,
} from "lucide-react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations } from "next-intl"
import type { DashboardSummaryResponse } from "@devloggers/api-client"

interface DashboardKpiCardsProps {
    data: DashboardSummaryResponse | undefined
    isLoading: boolean
}

function formatNumber(value: number) {
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value)
}

export function DashboardKpiCards({ data, isLoading }: DashboardKpiCardsProps) {
    const t = useTranslations("business.dashboard.kpi")

    const cards = [
        {
            label: t("totalSales"),
            value: data?.totalSales ?? 0,
            icon: TrendingUp,
            iconClass: "text-emerald-500",
        },
        {
            label: t("totalPurchases"),
            value: data?.totalPurchases ?? 0,
            icon: ShoppingCart,
            iconClass: "text-blue-500",
        },
        {
            label: t("netProfit"),
            value: data?.netProfit ?? 0,
            icon: LineChart,
            iconClass: "text-violet-500",
        },
        {
            label: t("totalExpenses"),
            value: data?.totalExpenses ?? 0,
            icon: CreditCard,
            iconClass: "text-amber-500",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card key={card.label}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.label}
                            </CardTitle>
                            <Icon className={`h-4 w-4 ${card.iconClass}`} />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-32" />
                            ) : (
                                <div className="text-2xl font-bold">
                                    {formatNumber(card.value)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
