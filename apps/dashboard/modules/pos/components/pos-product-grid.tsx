"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Package, Search } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { useApi } from "@/shared/useApi"
import type { ItemsClient } from "@devloggers/api-client"
import type { CrudListDataItem } from "@devloggers/api-client"
import type { PosCartLine } from "../pos.config"

type PosItem = CrudListDataItem<ItemsClient>

type PosProductGridProps = {
    warehouseId: string
    warehouseName: string
    onAdd: (item: Omit<PosCartLine, "quantity" | "discountPercent">) => void
}

export function PosProductGrid({ warehouseId, warehouseName, onAdd }: PosProductGridProps) {
    const t = useTranslations("business.pos")
    const api = useApi()
    const [query, setQuery] = useState("")

    const itemsQuery = useQuery({
        queryKey: ["pos", "items", query],
        queryFn: () =>
            api.items.list({
                search: query || undefined,
                searchIn: "name,barcode",
                limit: 40,
                filters: { isActive: { $eq: true } },
            }),
    })

    const balancesQuery = useQuery({
        queryKey: ["pos", "balances", warehouseId],
        queryFn: () => api.inventory.list({ warehouseId }),
    })

    const stockByItemId = useMemo(() => {
        const map = new Map<string, number>()
        for (const balance of balancesQuery.data?.data ?? []) map.set(balance.itemId, balance.quantity)
        return map
    }, [balancesQuery.data])

    const items = itemsQuery.data?.data ?? []

    function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key !== "Enter") return
        const exactBarcodeMatch = items.find((item: PosItem) => item.barcode && item.barcode === query.trim())
        if (exactBarcodeMatch) {
            addToCart(exactBarcodeMatch)
            setQuery("")
        }
    }

    function addToCart(item: PosItem) {
        onAdd({
            itemId: item.id,
            itemName: item.name,
            unitId: item.baseUnitId,
            unitLabel: "",
            unitPrice: item.defaultSellingPrice ?? 0,
            availableQuantity: stockByItemId.get(item.id),
        })
    }

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t("sellingFrom", { warehouse: warehouseName })}</p>
            <div className="relative">
                <Search className="absolute inset-y-0 inset-s-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t("searchPlaceholder")}
                    className="ps-9"
                />
            </div>

            <div className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4" style={{ maxHeight: "calc(100vh - 14rem)" }}>
                {items.map((item: PosItem) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => addToCart(item)}
                        className="group flex flex-col gap-2 overflow-hidden rounded-lg border bg-card p-3 text-start shadow-sm transition-colors hover:border-primary/50"
                    >
                        {item.mainImageUrl ? (
                            <span className="block h-24 w-full overflow-hidden rounded-md border bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={item.mainImageUrl}
                                    alt={item.name}
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            </span>
                        ) : (
                            <span className="flex h-24 w-full items-center justify-center rounded-md border bg-muted">
                                <Package className="h-6 w-6 text-muted-foreground" />
                            </span>
                        )}
                        <span className="line-clamp-2 text-sm font-semibold">{item.name}</span>
                        <div className="mt-auto flex items-center justify-between">
                            <span className="font-bold text-primary">{item.defaultSellingPrice ?? 0}</span>
                            <span className="text-xs text-muted-foreground">
                                {t("stock")}: {stockByItemId.get(item.id) ?? 0}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
