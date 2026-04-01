"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/shared/components/ui/chart"
import type { DashboardData } from "./use-dashboard-data"

const chartConfig = {
    amount: {
        label: "Amount",
        color: "var(--color-blue-500, #3b82f6)",
    },
} satisfies ChartConfig

type Props = { data: DashboardData }

export function FinancialSummaryChart({ data }: Props) {
    const summary = data.financial_summary
    const currency = summary?.currency ?? ""

    const chartData = (summary?.chart ?? []).map((item) => ({
        label: item.label ?? "",
        amount: item.amount ?? 0,
        count: item.count ?? 0,
    }))

    const colors = ["#3b82f6", "#f59e0b", "#ef4444"]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>
                    Invoices, expenses & bills breakdown ({currency})
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-75 w-full">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString()} />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    formatter={(value, _name, item) => (
                                        <div className="flex flex-col">
                                            <span className="font-medium">{currency} {Number(value).toLocaleString()}</span>
                                            <span className="text-muted-foreground">{item.payload.count} document(s)</span>
                                        </div>
                                    )}
                                />
                            }
                        />
                        <Bar
                            dataKey="amount"
                            radius={[6, 6, 0, 0]}
                            fill="var(--color-amount)"
                            barSize={48}
                        >
                            {chartData.map((_entry, index) => (
                                <rect key={index} fill={colors[index % colors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
