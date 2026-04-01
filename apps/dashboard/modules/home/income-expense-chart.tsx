"use client"

import {
    Area,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/shared/components/ui/chart"
import type { DashboardData } from "./use-dashboard-data"

const chartConfig = {
    income: {
        label: "Income",
        color: "var(--color-emerald-500, #10b981)",
    },
    expense: {
        label: "Expense",
        color: "var(--color-red-500, #ef4444)",
    },
} satisfies ChartConfig

type Props = { data: DashboardData }

export function IncomeExpenseChart({ data }: Props) {
    const series = data.chart?.series ?? []
    const currency = data.chart?.currency ?? ""

    const chartData = series.map((item) => ({
        date: item.date ?? "",
        income: item.income ?? 0,
        expense: item.expense ?? 0,
    }))

    return (
        <Card>
            <CardHeader>
                <CardTitle>Income vs Expenses</CardTitle>
                <CardDescription>
                    Financial trend over the selected period ({currency})
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-75 w-full">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value: string) => {
                                const date = new Date(value)
                                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            }}
                        />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toLocaleString()}`} />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        return new Date(value).toLocaleDateString("en-US", {
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                        })
                                    }}
                                />
                            }
                        />
                        <Area
                            type="monotone"
                            dataKey="income"
                            stroke="var(--color-income)"
                            fill="url(#fillIncome)"
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="expense"
                            stroke="var(--color-expense)"
                            fill="url(#fillExpense)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
