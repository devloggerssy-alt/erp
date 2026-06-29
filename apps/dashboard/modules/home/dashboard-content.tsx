"use client"

import * as React from "react"
import { startOfMonth } from "date-fns"
import { useTranslations } from "next-intl"
import DashboardPage from "@/infrastructure/components/layout/dashboard/dashboard-page"
import { DashboardDateRangePicker } from "./components/dashboard-date-range-picker"
import { DashboardKpiCards } from "./components/dashboard-kpi-cards"
import { DashboardCashboxCards } from "./components/dashboard-cashbox-cards"
import { DashboardQuickActions } from "./components/dashboard-quick-actions"
import { DashboardChart } from "./components/dashboard-chart"
import { DashboardLowStock } from "./components/dashboard-low-stock"
import { DashboardRecentPayments } from "./components/dashboard-recent-payments"
import { DashboardItemsOverview } from "./components/dashboard-items-overview"
import { useDashboardSummary } from "./hooks/use-dashboard-summary"
import { useDashboardChart } from "./hooks/use-dashboard-chart"

export function DashboardContent() {
    const t = useTranslations("business.dashboard")

    const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: new Date(),
    })

    const fromIso = dateRange.from.toISOString()
    const toIso = dateRange.to.toISOString()

    const summary = useDashboardSummary(fromIso, toIso)
    const chart = useDashboardChart(fromIso, toIso)

    return (
        <DashboardPage
            title={t("title")}
            description={t("description")}
            toolbar={
                <DashboardDateRangePicker
                    from={dateRange.from}
                    to={dateRange.to}
                    onChange={setDateRange}
                />
            }
        >
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <DashboardKpiCards
                    data={summary.data}
                    isLoading={summary.isLoading}
                />

                <DashboardCashboxCards
                    cashboxes={summary.data?.cashboxes ?? []}
                    isLoading={summary.isLoading}
                />

                <DashboardQuickActions />

                <div className="grid gap-4 md:grid-cols-7">
                    <div className="md:col-span-5">
                        <DashboardChart
                            data={chart.data ?? []}
                            isLoading={chart.isLoading}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <DashboardLowStock />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-7">
                    <div className="md:col-span-4">
                        <DashboardRecentPayments />
                    </div>
                    <div className="md:col-span-3">
                        <DashboardItemsOverview
                            data={summary.data}
                            isLoading={summary.isLoading}
                        />
                    </div>
                </div>
            </div>
        </DashboardPage>
    )
}
