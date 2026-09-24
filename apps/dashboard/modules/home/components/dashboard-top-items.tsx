"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import type { DashboardTopItem } from "@devloggers/api-client"

function formatCompact(value: number) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}

interface DashboardTopItemsProps {
    data: DashboardTopItem[] | undefined
    isLoading: boolean
}

export function DashboardTopItems({ data, isLoading }: DashboardTopItemsProps) {
    const t = useTranslations("business.dashboard.topItems")

    const chartConfig = {
        revenue: { label: t("revenue"), color: "var(--chart-1)" },
    } satisfies ChartConfig

    const rows = (data ?? []).map((item) => ({
        key: item.itemId,
        label: item.itemName || item.itemCode,
        revenue: item.revenue,
    }))

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                ) : rows.length === 0 ? (
                    <div className="flex h-[220px] w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <p className="text-sm">{t("empty")}</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
                        <BarChart data={rows} layout="vertical" margin={{ left: 12 }}>
                            <XAxis type="number" tickFormatter={formatCompact} fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="label" fontSize={12} tickLine={false} axisLine={false} width={110} />
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
