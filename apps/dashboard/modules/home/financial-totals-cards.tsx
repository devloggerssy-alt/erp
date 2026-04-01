"use client"

import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import type { DashboardData } from "./use-dashboard-data"

type Props = { data: DashboardData }

export function FinancialTotalsCards({ data }: Props) {
    const totals = data.totals

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Income
                    </CardTitle>
                    <div className="rounded-md bg-emerald-500/10 p-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">
                        {totals?.total_income_text ?? `${totals?.currency ?? ""} 0.00`}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                        Income this period
                    </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-emerald-500/5" />
            </Card>

            <Card className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Expenses
                    </CardTitle>
                    <div className="rounded-md bg-red-500/10 p-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                        {totals?.total_expense_text ?? `${totals?.currency ?? ""} 0.00`}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                        Expenses this period
                    </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-red-500/5" />
            </Card>
        </div>
    )
}
