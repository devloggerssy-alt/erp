"use client"

import * as React from "react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading || !mounted ? (
                    <Skeleton className="h-[320px] w-full" />
                ) : (
                    <div className="h-[320px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    width={70}
                                    tickFormatter={(v) =>
                                        new Intl.NumberFormat(undefined, {
                                            notation: "compact",
                                        }).format(v)
                                    }
                                />
                                <Tooltip
                                    cursor={{ fill: "#88888811" }}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "1px solid #88888833",
                                        fontSize: "12px",
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }} />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    name={t("sales")}
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="url(#colorSales)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="purchases"
                                    name={t("purchases")}
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorPurchases)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
