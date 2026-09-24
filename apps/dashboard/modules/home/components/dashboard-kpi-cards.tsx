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
import { DashboardKpiDelta } from "./dashboard-kpi-delta"

interface DashboardKpiCardsProps {
    data: DashboardSummaryResponse | undefined
    previousData: DashboardSummaryResponse | undefined
    isLoading: boolean
}

function formatNumber(value: number) {
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value)
}

export function DashboardKpiCards({ data, previousData, isLoading }: DashboardKpiCardsProps) {
    const t = useTranslations("business.dashboard.kpi")

    const cards = [
        {
            label: t("totalSales"),
            value: data?.totalSales ?? 0,
            previousValue: previousData?.totalSales ?? 0,
            higherIsBetter: true,
            icon: TrendingUp,
            iconClass: "text-[var(--chart-1)]",
        },
        {
            label: t("totalPurchases"),
            value: data?.totalPurchases ?? 0,
            previousValue: previousData?.totalPurchases ?? 0,
            higherIsBetter: false,
            icon: ShoppingCart,
            iconClass: "text-[var(--chart-2)]",
        },
        {
            label: t("netProfit"),
            value: data?.netProfit ?? 0,
            previousValue: previousData?.netProfit ?? 0,
            higherIsBetter: true,
            icon: LineChart,
            iconClass: "text-[var(--chart-4)]",
        },
        {
            label: t("totalExpenses"),
            value: data?.totalExpenses ?? 0,
            previousValue: previousData?.totalExpenses ?? 0,
            higherIsBetter: false,
            icon: CreditCard,
            iconClass: "text-[var(--chart-3)]",
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
                                <div className="flex items-baseline gap-2">
                                    <div className="text-2xl font-bold">
                                        {formatNumber(card.value)}
                                    </div>
                                    <DashboardKpiDelta
                                        current={card.value}
                                        previous={card.previousValue}
                                        higherIsBetter={card.higherIsBetter}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
