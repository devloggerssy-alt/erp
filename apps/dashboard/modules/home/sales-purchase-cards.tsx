"use client"

import { FileText, FileSearch, Receipt, ShoppingCart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import type { DashboardData } from "./use-dashboard-data"

type Props = { data: DashboardData }

export function SalesPurchaseCards({ data }: Props) {
    const sales = data.sales_totals
    const purchase = data.purchase_totals

    const salesStats = [
        { label: "Inspections", value: sales?.inspections ?? 0, icon: FileSearch },
        { label: "Estimates", value: sales?.estimates ?? 0, icon: FileText },
        { label: "Invoices", value: sales?.invoices ?? 0, icon: Receipt },
    ]

    const purchaseStats = [
        { label: "Purchase Orders", value: purchase?.purchase_orders ?? 0, icon: ShoppingCart },
        { label: "Bills", value: purchase?.bills ?? 0, icon: Receipt },
        { label: "Expenses", value: purchase?.expenses ?? 0, icon: FileText },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Sales Documents</CardTitle>
                    <span className="text-2xl font-bold text-emerald-600">
                        {sales?.total_sales_documents ?? 0}
                    </span>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                        {salesStats.map((stat) => (
                            <div
                                key={stat.label}
                                className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center"
                            >
                                <stat.icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-lg font-bold">{stat.value}</span>
                                <span className="text-[11px] text-muted-foreground leading-tight">
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Purchase Documents</CardTitle>
                    <span className="text-2xl font-bold text-blue-600">
                        {purchase?.total_purchase_documents ?? 0}
                    </span>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                        {purchaseStats.map((stat) => (
                            <div
                                key={stat.label}
                                className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center"
                            >
                                <stat.icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-lg font-bold">{stat.value}</span>
                                <span className="text-[11px] text-muted-foreground leading-tight">
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
