"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { ShoppingCart, FileText } from "lucide-react"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { ReportLayout } from "../shared/report-layout"
import { StatCard } from "../shared/stat-card"
import { ReportTable } from "../shared/report-table"
import type { InvoiceReportItem } from "@devloggers/api-client"

export function PurchasesReportPage() {
    const api = useApi()
    const [from, setFrom] = useState("")
    const [to, setTo] = useState("")
    const [filters, setFilters] = useState<{ from?: string; to?: string }>({})

    const { data, isLoading } = useQuery({
        queryKey: ["reports", "purchase-summary", filters],
        queryFn: () => api.reports.purchaseSummary(filters),
    })

    const invoices: InvoiceReportItem[] = data?.invoices ?? []
    const totalPurchases = data?.totalPurchases ?? 0
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

    const hasFilters = !!filters.from || !!filters.to

    const columns = [
        { key: "number", header: "Invoice #" },
        {
            key: "date",
            header: "Date",
            render: (r: InvoiceReportItem) => new Date(r.date).toLocaleDateString(),
        },
        {
            key: "party",
            header: "Supplier",
            render: (r: InvoiceReportItem) => r.party?.name ?? "—",
        },
        {
            key: "total",
            header: "Total",
            align: "right" as const,
            render: (r: InvoiceReportItem) => Number(r.total).toLocaleString(),
        },
    ]

    return (
        <ReportLayout
            title="Purchases Report"
            description="Purchase invoice summary with supplier breakdown."
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
            <div className="grid gap-4 sm:grid-cols-2">
                <StatCard
                    title="Total Purchases"
                    value={totalPurchases.toLocaleString()}
                    icon={ShoppingCart}
                    variant="warning"
                />
                <StatCard title="Invoices" value={count} icon={FileText} />
            </div>

            <ReportTable
                columns={columns}
                rows={invoices}
                isLoading={isLoading}
                getRowKey={(r) => r.id}
            />
        </ReportLayout>
    )
}
