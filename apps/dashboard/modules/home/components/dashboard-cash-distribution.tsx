"use client"

import { Pie, PieChart, Cell } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { localize } from "@/shared/lib/localize"
import type { DashboardCashbox } from "@devloggers/api-client"

const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

interface DashboardCashDistributionProps {
    cashboxes: DashboardCashbox[]
    isLoading: boolean
}

interface CurrencyGroup {
    currencyCode: string
    currencySymbol: string
    slices: { name: string; value: number }[]
    total: number
}

function groupByCurrency(cashboxes: DashboardCashbox[], locale: string): CurrencyGroup[] {
    const groups = new Map<string, CurrencyGroup>()

    for (const cashbox of cashboxes) {
        const balance = Number(cashbox.balance)
        if (balance <= 0) continue

        const code = cashbox.currency.code
        const group = groups.get(code) ?? {
            currencyCode: code,
            currencySymbol: localize(cashbox.currency.symbol, locale, code),
            slices: [],
            total: 0,
        }
        group.slices.push({ name: localize(cashbox.name, locale), value: balance })
        group.total += balance
        groups.set(code, group)
    }

    return Array.from(groups.values())
}

export function DashboardCashDistribution({ cashboxes, isLoading }: DashboardCashDistributionProps) {
    const t = useTranslations("business.dashboard.cashDistribution")
    const locale = useLocale()

    const groups = groupByCurrency(cashboxes, locale)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-[240px] w-full" />
                ) : groups.length === 0 ? (
                    <div className="flex h-[240px] w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <p className="text-sm">{t("empty")}</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center gap-6">
                        {groups.map((group) => {
                            const chartConfig = Object.fromEntries(
                                group.slices.map((slice, i) => [
                                    slice.name,
                                    { label: slice.name, color: SLICE_COLORS[i % SLICE_COLORS.length] },
                                ]),
                            ) satisfies ChartConfig

                            return (
                                <div key={group.currencyCode} className="flex flex-col items-center gap-2">
                                    <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-[180px]">
                                        <PieChart>
                                            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                                            <Pie
                                                data={group.slices}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={45}
                                                outerRadius={70}
                                                strokeWidth={2}
                                            >
                                                {group.slices.map((slice, i) => (
                                                    <Cell key={slice.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ChartContainer>
                                    <p className="text-sm font-medium">
                                        {group.currencySymbol}{" "}
                                        {new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
                                            group.total,
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{group.currencyCode}</p>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
