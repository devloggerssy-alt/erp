"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
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
    const t = useTranslations("business.reports.stock")
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
        { key: "itemCode", header: t("columns.itemCode") },
        { key: "itemName", header: t("columns.itemName") },
        { key: "warehouseCode", header: t("columns.warehouse") },
        {
            key: "quantity",
            header: t("columns.quantity"),
            align: "right" as const,
            render: (r: StockBalanceReportItem) => (
                <span className={r.quantity <= 0 ? "font-medium text-rose-600" : ""}>
                    {r.quantity.toLocaleString()}
                </span>
            ),
        },
        {
            key: "averageCost",
            header: t("columns.avgCost"),
            align: "right" as const,
            render: (r: StockBalanceReportItem) => Number(r.averageCost).toLocaleString(),
        },
        {
            key: "updatedAt",
            header: t("columns.lastUpdated"),
            render: (r: StockBalanceReportItem) =>
                r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—",
        },
    ]

    return (
        <ReportLayout
            title={t("title")}
            description={t("description")}
            filters={
                <>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("filters.warehouse")}</Label>
                        <Select value={warehouseId ?? "all"} onValueChange={(v) => setWarehouseId(v === "all" ? undefined : v)}>
                            <SelectTrigger className="w-52">
                                <SelectValue placeholder={t("filters.allWarehouses")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("filters.allWarehouses")}</SelectItem>
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
                            {t("filters.clear")}
                        </Button>
                    )}
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard title={t("stats.itemsInStock")} value={totalItems} icon={Package} />
                <StatCard title={t("stats.totalQuantity")} value={totalQty.toLocaleString()} icon={BarChart3} />
                <StatCard
                    title={t("stats.outOfStock")}
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
