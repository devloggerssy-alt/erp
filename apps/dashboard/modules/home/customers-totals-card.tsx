"use client"

import { Users, Building2, Truck, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import type { DashboardData } from "./use-dashboard-data"

type Props = { data: DashboardData }

export function CustomersTotalsCard({ data }: Props) {
    const customers = data.customers_totals

    const stats = [
        { label: "Individuals", value: customers?.individuals ?? 0, icon: Users, color: "text-sky-600", bg: "bg-sky-500/10" },
        { label: "Companies", value: customers?.companies ?? 0, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-500/10" },
        { label: "Fleets", value: customers?.fleets ?? 0, icon: Truck, color: "text-teal-600", bg: "bg-teal-500/10" },
        { label: "Insurers", value: customers?.insurers ?? 0, icon: Shield, color: "text-rose-600", bg: "bg-rose-500/10" },
    ]

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <span className="text-2xl font-bold">{customers?.total_customers ?? 0}</span>
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
