"use client"

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { localize } from "@/shared/lib/localize"
import type { DashboardExpenseBreakdownItem } from "@devloggers/api-client"

const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const OTHER_COLOR = "var(--muted-foreground)"

interface DashboardExpenseBreakdownProps {
    data: DashboardExpenseBreakdownItem[] | undefined
    isLoading: boolean
}

function formatCompact(value: number) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}

export function DashboardExpenseBreakdown({ data, isLoading }: DashboardExpenseBreakdownProps) {
    const t = useTranslations("business.dashboard.expenseBreakdown")
    const locale = useLocale()

    const rows = (data ?? []).map((item, i) => ({
        key: item.accountId,
        label: localize(item.accountName, locale),
        value: item.total,
        color: item.accountId === "other" ? OTHER_COLOR : SLICE_COLORS[i % SLICE_COLORS.length],
    }))

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
