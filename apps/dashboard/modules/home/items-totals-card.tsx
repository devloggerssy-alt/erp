"use client"

import { Package, Wrench, Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import type { DashboardData } from "./use-dashboard-data"

type Props = { data: DashboardData }

export function ItemsTotalsCard({ data }: Props) {
    const items = data.items_totals

    const stats = [
        { label: "Parts", value: items?.parts ?? 0, icon: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
        { label: "Services", value: items?.services ?? 0, icon: Wrench, color: "text-violet-600", bg: "bg-violet-500/10" },
        { label: "Service Groups", value: items?.service_groups ?? 0, icon: Layers, color: "text-amber-600", bg: "bg-amber-500/10" },
    ]

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Items</CardTitle>
                <span className="text-2xl font-bold">{items?.total_items ?? 0}</span>
            </CardHeader>
            <CardContent className="space-y-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`rounded-md p-1.5 ${stat.bg}`}>
                                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                            </div>
                            <span className="text-sm text-muted-foreground">{stat.label}</span>
                        </div>
                        <span className="text-sm font-semibold">{stat.value}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
