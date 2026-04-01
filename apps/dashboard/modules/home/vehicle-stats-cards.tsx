"use client"

import { Car } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/shared/components/ui/chart"
import type { DashboardData } from "./use-dashboard-data"

const chartConfig = {
    vehicles_count: {
        label: "Vehicles",
        color: "var(--color-blue-500, #3b82f6)",
    },
} satisfies ChartConfig

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#6366f1"]

type Props = { data: DashboardData }

export function VehicleStatsCards({ data }: Props) {
    const bodyTypes = data.body_types_vehicle_totals ?? []
    const makes = data.make_model_vehicle_totals?.makes ?? []

    const bodyData = bodyTypes.map((bt) => ({
        name: bt.body_type ?? "Unknown",
        vehicles_count: bt.vehicles_count ?? 0,
    }))

    const makeData = makes.map((m) => ({
        name: m.make ?? "Unknown",
        vehicles_count: m.vehicles_count ?? 0,
    }))

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <CardTitle>Vehicles by Body Type</CardTitle>
                            <CardDescription>Distribution across body types</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {bodyData.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-55 w-full">
                            <BarChart data={bodyData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                                <XAxis type="number" tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={80} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="vehicles_count" radius={[0, 6, 6, 0]} barSize={24}>
                                    {bodyData.map((_entry, index) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No vehicle data</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <CardTitle>Vehicles by Make</CardTitle>
                            <CardDescription>Top vehicle manufacturers</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {makeData.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-55 w-full">
                            <BarChart data={makeData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                                <XAxis type="number" tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={80} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="vehicles_count" radius={[0, 6, 6, 0]} barSize={24}>
                                    {makeData.map((_entry, index) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No vehicle data</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
