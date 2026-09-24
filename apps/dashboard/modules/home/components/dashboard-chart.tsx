"use client"

import * as React from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, type LabelProps } from "recharts"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/shared/components/ui/chart"
import { useTranslations } from "next-intl"
import type { DashboardChartPoint } from "@devloggers/api-client"

interface DashboardChartProps {
    data: DashboardChartPoint[]
    isLoading: boolean
}

function formatDate(dateStr: string) {
    try {
        return format(new Date(dateStr + "T00:00:00"), "MMM d")
    } catch {
        return dateStr
    }
}

function formatCompact(value: number) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}

function makeEndLabel(lastIndex: number) {
    return function EndLabel({ x, y, index, value }: LabelProps) {
        if (index !== lastIndex || x === undefined || y === undefined || value == null || typeof value === "boolean") {
            return null
        }
        const cx = Number(x)
        const cy = Number(y)
        return (
            <text x={cx} y={cy - 10} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                {formatCompact(Number(value))}
            </text>
        )
    }
}

export function DashboardChart({ data, isLoading }: DashboardChartProps) {
    const t = useTranslations("business.dashboard.chart")
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = data.map((point) => ({
        ...point,
        date: formatDate(point.date),
    }))

    const chartConfig = {
        sales: { label: t("sales"), color: "var(--chart-1)" },
        purchases: { label: t("purchases"), color: "var(--chart-2)" },
    } satisfies ChartConfig

    const EndLabel = makeEndLabel(chartData.length - 1)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading || !mounted ? (
                    <Skeleton className="h-[320px] w-full" />
                ) : chartData.length === 0 ? (
                    <div className="flex h-[320px] w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <p className="text-sm">{t("empty")}</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full" dir="ltr">
                        <AreaChart data={chartData} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-purchases)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--color-purchases)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={70}
                                tickFormatter={formatCompact}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Area
                                type="monotone"
                                dataKey="sales"
                                stroke="var(--color-sales)"
                                strokeWidth={2}
                                fill="url(#colorSales)"
                                label={EndLabel}
                            />
                            <Area
                                type="monotone"
                                dataKey="purchases"
                                stroke="var(--color-purchases)"
                                strokeWidth={2}
                                fill="url(#colorPurchases)"
                                label={EndLabel}
                            />
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
