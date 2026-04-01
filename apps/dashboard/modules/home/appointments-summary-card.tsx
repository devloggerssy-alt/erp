"use client"

import { CalendarCheck, CalendarX, Eye, Ban } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import type { DashboardData } from "./use-dashboard-data"

type Props = { data: DashboardData }

export function AppointmentsSummaryCard({ data }: Props) {
    const totals = data.appointments_summary?.totals

    const stats = [
        {
            label: "Completed",
            value: totals?.completed?.text ?? "0 Appt.",
            icon: CalendarCheck,
            color: "text-emerald-600",
            bg: "bg-emerald-500/10",
        },
        {
            label: "No Shows",
            value: totals?.no_shows?.text ?? "0 Appt.",
            icon: Eye,
            color: "text-amber-600",
            bg: "bg-amber-500/10",
        },
        {
            label: "No-Show Rate",
            value: totals?.no_shows_rate?.text ?? "0%",
            icon: Ban,
            color: "text-red-600",
            bg: "bg-red-500/10",
        },
        {
            label: "Cancelled",
            value: totals?.cancelled?.text ?? "0 Appt.",
            icon: CalendarX,
            color: "text-slate-600",
            bg: "bg-slate-500/10",
        },
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Appointments Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="flex items-center gap-3 rounded-lg border p-3"
                        >
                            <div className={`rounded-md p-2 ${stat.bg}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium">{stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
