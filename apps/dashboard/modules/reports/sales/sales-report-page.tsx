"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { TrendingUp, FileText, TrendingDown, DollarSign } from "lucide-react"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { ReportLayout } from "../shared/report-layout"
import { StatCard } from "../shared/stat-card"
import { ReportTable } from "../shared/report-table"
import type { InvoiceReportItem } from "@devloggers/api-client"

export function SalesReportPage() {
    const api = useApi()
    const [from, setFrom] = useState("")
    const [to, setTo] = useState("")
    const [filters, setFilters] = useState<{ from?: string; to?: string }>({})

    const { data, isLoading } = useQuery({
        queryKey: ["reports", "sales-summary", filters],
        queryFn: () => api.reports.salesSummary(filters),
    })

    const { data: profitData, isLoading: profitLoading } = useQuery({
        queryKey: ["reports", "profit-summary", filters],
        queryFn: () => api.reports.profitSummary(filters),
    })

    const invoices: InvoiceReportItem[] = data?.invoices ?? []
    const totalSales = data?.totalSales ?? 0
    const count = data?.count ?? 0

    function applyFilters() {
        setFilters({
            from: from || undefined,
            to: to || undefined,
        })
    }

    function clearFilters() {
        setFrom("")
        setTo("")
        setFilters({})
    }

    const columns = [
        { key: "number", header: "Invoice #" },
        {
            key: "date",
            header: "Date",
            render: (r: InvoiceReportItem) => new Date(r.date).toLocaleDateString(),
        },
        {
            key: "party",
            header: "Customer",
            render: (r: InvoiceReportItem) => r.party?.name ?? "—",
        },
        {
            key: "total",
            header: "Total",
            align: "right" as const,
            render: (r: InvoiceReportItem) => Number(r.total).toLocaleString(),
        },
    ]

    const hasFilters = !!filters.from || !!filters.to

    return (
        <ReportLayout
            title="Sales Report"
            description="Sales invoice summary with totals and profit overview."
            filters={
                <>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">From</Label>
                        <Input
                            type="date"
                            className="w-40"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">To</Label>
                        <Input
                            type="date"
                            className="w-40"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>
                    <Button size="sm" className="self-end" onClick={applyFilters}>
                        Apply
                    </Button>
                    {hasFilters && (
                        <Button variant="ghost" size="sm" className="self-end" onClick={clearFilters}>
                            Clear
                        </Button>
                    )}
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Sales"
                    value={totalSales.toLocaleString()}
                    icon={TrendingUp}
                    variant="success"
                />
                <StatCard title="Invoices" value={count} icon={FileText} />
                <StatCard
                    title="Gross Profit"
                    value={(profitData?.grossProfit ?? 0).toLocaleString()}
                    icon={DollarSign}
                    variant={profitData?.grossProfit && profitData.grossProfit > 0 ? "success" : "danger"}
                />
                <StatCard
                    title="Net Profit"
                    value={(profitData?.netProfit ?? 0).toLocaleString()}
                    icon={TrendingDown}
                    variant={profitData?.netProfit && profitData.netProfit > 0 ? "success" : "danger"}
                    subtitle={`Expenses: ${(profitData?.totalExpenses ?? 0).toLocaleString()}`}
                />
            </div>

            <ReportTable
                columns={columns}
                rows={invoices}
                isLoading={isLoading || profitLoading}
                getRowKey={(r) => r.id}
            />
        </ReportLayout>
    )
}
