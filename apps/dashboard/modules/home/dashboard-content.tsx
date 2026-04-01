"use client"

import { Loader2 } from "lucide-react"
import { useDashboardData } from "./use-dashboard-data"
import { FinancialTotalsCards } from "./financial-totals-cards"
import { IncomeExpenseChart } from "./income-expense-chart"
import { FinancialSummaryChart } from "./financial-summary-chart"
import { WorkOrdersStatusCard } from "./work-orders-status-card"
import { AppointmentsSummaryCard } from "./appointments-summary-card"
import { UpcomingAppointmentsCard } from "./upcoming-appointments-card"
import { ItemsTotalsCard } from "./items-totals-card"
import { CustomersTotalsCard } from "./customers-totals-card"
import { SalesPurchaseCards } from "./sales-purchase-cards"
import { VehicleStatsCards } from "./vehicle-stats-cards"

export function DashboardContent() {
    const { data, isLoading, isError, error } = useDashboardData()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <p className="text-lg font-medium">Failed to load dashboard</p>
                <p className="text-sm">{error?.message ?? "An unexpected error occurred"}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Financial Overview */}
            <FinancialTotalsCards data={data} />

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-2">
                <IncomeExpenseChart data={data} />
                <FinancialSummaryChart data={data} />
            </div>

            {/* Work Orders + Appointments */}
            <div className="grid gap-4 lg:grid-cols-2">
                <WorkOrdersStatusCard data={data} />
                <AppointmentsSummaryCard data={data} />
            </div>

            {/* Upcoming Appointments */}
            <UpcomingAppointmentsCard data={data} />

            {/* Sales & Purchase Documents */}
            <SalesPurchaseCards data={data} />

            {/* Quick Stats Row */}
            <div className="grid gap-4 md:grid-cols-2">
                <ItemsTotalsCard data={data} />
                <CustomersTotalsCard data={data} />
            </div>

            {/* Vehicle Statistics */}
            <VehicleStatsCards data={data} />
        </div>
    )
}
