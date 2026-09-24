"use client"

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import type { DashboardSummaryResponse } from "@devloggers/api-client"

interface DashboardRevenueBreakdownProps {
    data: DashboardSummaryResponse | undefined
    isLoading: boolean
}

function formatCompact(value: number) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}

export function DashboardRevenueBreakdown({ data, isLoading }: DashboardRevenueBreakdownProps) {
    const t = useTranslations("business.dashboard.revenueBreakdown")

    const rows = [
        { key: "sales", label: t("sales"), value: data?.totalSales ?? 0, color: "var(--chart-1)" },
        { key: "purchases", label: t("purchases"), value: data?.totalPurchases ?? 0, color: "var(--chart-2)" },
        { key: "expenses", label: t("expenses"), value: data?.totalExpenses ?? 0, color: "var(--chart-3)" },
        { key: "netProfit", label: t("netProfit"), value: data?.netProfit ?? 0, color: "var(--chart-4)" },
    ]

    const chartConfig = Object.fromEntries(
        rows.map((row) => [row.key, { label: row.label, color: row.color }]),
    ) satisfies ChartConfig

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
                        <BarChart data={rows} layout="vertical" margin={{ left: 12 }}>
                            <XAxis type="number" tickFormatter={formatCompact} fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="label" fontSize={12} tickLine={false} axisLine={false} width={90} />
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="value" radius={4}>
                                {rows.map((row) => (
                                    <Cell key={row.key} fill={row.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
