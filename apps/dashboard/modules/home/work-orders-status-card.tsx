"use client"

import { ClipboardList } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Progress } from "@/shared/components/ui/progress"
import type { DashboardData } from "./use-dashboard-data"


type Props = { data: DashboardData }

const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    check_in: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    invoiced: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
}

export function WorkOrdersStatusCard({ data }: Props) {
    const d = data as Record<string, unknown>
    const workOrders = d.work_orders_status as Record<string, unknown> | undefined
    const cards = (workOrders?.cards as unknown[]) ?? []
    const totals = workOrders?.totals as Record<string, unknown> | undefined
    const totalOrders = (totals?.orders as number) ?? 0

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Work Orders</CardTitle>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold">{String(totals?.orders_text ?? "0 Orders")}</p>
                    <p className="text-xs text-muted-foreground">{String(totals?.amount_text ?? "")}</p>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {cards.map((card: unknown) => {
                    const c = card as Record<string, unknown>
                    const percentage = totalOrders > 0 ? ((c.count as number) ?? 0) / totalOrders * 100 : 0
                    return (
                        <div key={String(c.status)} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="secondary"
                                        className={statusColors[String(c.status ?? "")] ?? ""}
                                    >
                                        {String(c.label ?? "")}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {String(c.orders_text ?? "")}
                                    </span>
                                </div>
                                <span className="text-sm font-medium">{String(c.amount_text ?? "")}</span>
                            </div>
                            <Progress value={percentage} className="h-1.5" />
                        </div>
                    )
                })}
                {cards.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No work orders this period
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
