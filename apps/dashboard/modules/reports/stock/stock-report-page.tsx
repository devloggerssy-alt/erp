"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { BarChart3, Package, Warehouse } from "lucide-react"
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { ReportLayout } from "../shared/report-layout"
import { StatCard } from "../shared/stat-card"
import { ReportTable } from "../shared/report-table"
import type { StockBalanceReportItem } from "@devloggers/api-client"

type Warehouse = { id: string; name: string; code: string }

export function StockReportPage() {
    const api = useApi()
    const [warehouseId, setWarehouseId] = useState<string | undefined>()

    const { data: warehouses = [] } = useQuery<Warehouse[]>({
        queryKey: ["warehouses", "list-for-filter"],
        queryFn: async () => {
            const res = await api.warehouses.list({ limit: 200 })
            return (res.data ?? []) as Warehouse[]
        },
    })

    const { data = [], isLoading } = useQuery<StockBalanceReportItem[]>({
        queryKey: ["reports", "stock-balance", warehouseId],
        queryFn: () => api.reports.stockBalance(warehouseId),
    })

    const totalItems = data.length
    const totalQty = data.reduce((s, r) => s + (r.quantity ?? 0), 0)
    const outOfStock = data.filter((r) => r.quantity <= 0).length

    const columns = [
        { key: "itemCode", header: "Item Code" },
        { key: "itemName", header: "Item Name" },
        { key: "warehouseCode", header: "Warehouse" },
        {
            key: "quantity",
            header: "Quantity",
            align: "right" as const,
            render: (r: StockBalanceReportItem) => (
                <span className={r.quantity <= 0 ? "font-medium text-rose-600" : ""}>
                    {r.quantity.toLocaleString()}
                </span>
            ),
        },
        {
            key: "averageCost",
            header: "Avg. Cost",
            align: "right" as const,
            render: (r: StockBalanceReportItem) => Number(r.averageCost).toLocaleString(),
        },
        {
            key: "updatedAt",
            header: "Last Updated",
            render: (r: StockBalanceReportItem) =>
                r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—",
        },
    ]

    return (
        <ReportLayout
            title="Stock Balance Report"
            description="Current inventory levels by item and warehouse."
            filters={
                <>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">Warehouse</Label>
                        <Select value={warehouseId ?? "all"} onValueChange={(v) => setWarehouseId(v === "all" ? undefined : v)}>
                            <SelectTrigger className="w-52">
                                <SelectValue placeholder="All warehouses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All warehouses</SelectItem>
                                {warehouses.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {warehouseId && (
                        <Button variant="ghost" size="sm" className="self-end" onClick={() => setWarehouseId(undefined)}>
                            Clear
                        </Button>
                    )}
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard title="Items in stock" value={totalItems} icon={Package} />
                <StatCard title="Total quantity" value={totalQty.toLocaleString()} icon={BarChart3} />
                <StatCard
                    title="Out of stock"
                    value={outOfStock}
                    icon={Warehouse}
                    variant={outOfStock > 0 ? "danger" : "success"}
                />
            </div>

            <ReportTable
                columns={columns}
                rows={data}
                isLoading={isLoading}
                getRowKey={(r) => `${r.warehouseId}_${r.itemId}`}
            />
        </ReportLayout>
    )
}
