import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import {
  inventoryResource,
  warehouseResource,
  fiscalPeriodResource,
  itemResource,
} from "@devloggers/api-contracts"
import type { OpeningStockRow } from "../components/opening-stock-columns"

export function useOpeningStock() {
  const api = useApi()
  const queryClient = useQueryClient()
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("")
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")
  const [dirtyRows, setDirtyRows] = useState<Record<string, OpeningStockRow>>({})

  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["opening-stock-warehouses"],
    queryFn: () => api[warehouseResource.key].list(),
    select: (res) =>
      (res?.data ?? []) as Array<{ id: string; name: string; code: string }>,
  })

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ["opening-stock-items"],
    queryFn: () => api[itemResource.key].list({ pageSize: 1000 }),
    select: (res) =>
      (res?.data ?? []) as Array<{
        id: string
        code: string
        name: string
        categoryName?: string
        isActive: boolean
      }>,
  })

  const { data: stockBalances } = useQuery({
    queryKey: ["opening-stock-balances", selectedWarehouseId],
    queryFn: () =>
      api[inventoryResource.key].list({ warehouseId: selectedWarehouseId }),
    enabled: !!selectedWarehouseId,
    select: (res) => {
      const items = (res?.data ?? []) as Array<{
        itemId: string
        quantity: number
      }>
      return new Map(items.map((b) => [b.itemId, b.quantity]))
    },
  })

  const { data: periods, isLoading: isLoadingPeriods } = useQuery({
    queryKey: ["opening-stock-periods"],
    queryFn: () => api[fiscalPeriodResource.key].list(),
    select: (res) => {
      const items = (res?.data ?? []) as Array<{
        id: string
        name: string
        status: string
      }>
      return items.filter((p) => p.status === "OPEN")
    },
  })

  const rows: OpeningStockRow[] = useMemo(() => {
    if (!items) return []
    return items
      .filter((item) => item.isActive)
      .map((item) => ({
        id: item.id,
        itemId: item.id,
        code: item.code,
        name: item.name,
        category: item.categoryName ?? "",
        currentQty: stockBalances?.get(item.id) ?? 0,
        openingQty: 0,
        unitCost: 0,
      }))
  }, [items, stockBalances])

  const handleDirtyChange = useCallback(
    (dirty: Record<string, OpeningStockRow>) => {
      setDirtyRows(dirty)
    },
    [],
  )

  const mutation = useMutation({
    mutationFn: () => {
      const itemsToPost = Object.values(dirtyRows)
        .filter((r) => r.openingQty > 0)
        .map((r) => ({
          itemId: r.itemId,
          quantity: r.openingQty,
          unitCost: r.unitCost,
        }))
      return api.inventoryOpening.post({
        warehouseId: selectedWarehouseId,
        fiscalPeriodId: selectedPeriodId,
        items: itemsToPost,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["opening-stock-balances"],
      })
      setDirtyRows({})
    },
  })

  const hasDirtyRows = Object.keys(dirtyRows).length > 0
  const isSaving = mutation.isPending

  const handleSave = useCallback(() => {
    if (!selectedWarehouseId || !selectedPeriodId || !hasDirtyRows) return
    mutation.mutate()
  }, [selectedWarehouseId, selectedPeriodId, hasDirtyRows, mutation])

  return {
    rows,
    warehouses: warehouses ?? [],
    periods: periods ?? [],
    selectedWarehouseId,
    setSelectedWarehouseId,
    selectedPeriodId,
    setSelectedPeriodId,
    handleDirtyChange,
    handleSave,
    hasDirtyRows,
    isSaving,
    isLoading: isLoadingWarehouses || isLoadingItems || isLoadingPeriods,
    error: mutation.error,
  }
}
