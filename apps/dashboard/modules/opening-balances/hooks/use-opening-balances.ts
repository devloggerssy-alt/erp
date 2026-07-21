import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { accountResource, accountOpeningBalanceResource, fiscalPeriodResource } from "@devloggers/api-contracts"
import type { OpeningBalanceRow } from "../components/opening-balances-columns"

export function useOpeningBalances() {
  const api = useApi()
  const queryClient = useQueryClient()
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")
  const [dirtyRows, setDirtyRows] = useState<Record<string, OpeningBalanceRow>>({})
  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["opening-balances-accounts"],
    queryFn: () => api[accountResource.key].list(),
    select: (res) => {
      const items = (res?.data ?? []) as Array<{
        id: string
        code: string
        name: string
        type: string
        isActive: boolean
      }>
      return items.filter(
        (a) =>
          ["ASSET", "LIABILITY", "EQUITY"].includes(a.type) &&
          a.isActive,
      )
    },
  })

  const { data: balancesData } = useQuery({
    queryKey: ["opening-balances-current"],
    queryFn: () => api[accountResource.key].balances(),
    select: (res) => {
      const items = ((res as Record<string, unknown>)?.data ?? []) as Array<{
        id: string
        ownBalance: number
      }>
      return new Map(items.map((b) => [b.id, b.ownBalance]))
    },
  })

  const { data: periodsData, isLoading: isLoadingPeriods } = useQuery({
    queryKey: ["opening-balances-periods"],
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

  const rows: OpeningBalanceRow[] = useMemo(() => {
    if (!accountsData) return []
    return accountsData.map((account) => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      currentBalance: balancesData?.get(account.id) ?? 0,
      openingAmount: 0,
    }))
  }, [accountsData, balancesData])

  const handleDirtyChange = useCallback((dirty: Record<string, OpeningBalanceRow>) => {
    setDirtyRows(dirty)
  }, [])

  const mutation = useMutation({
    mutationFn: () => {
      const entries = Object.values(dirtyRows)
        .filter((r) => r.openingAmount !== 0)
        .map((r) => ({
          accountId: r.id,
          amount: r.openingAmount,
        }))
      return api[accountOpeningBalanceResource.key].post({
        fiscalPeriodId: selectedPeriodId,
        entries,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opening-balances-current"] })
      setDirtyRows({})
    },
  })

  const hasDirtyRows = Object.keys(dirtyRows).length > 0
  const isSaving = mutation.isPending

  const handleSave = useCallback(() => {
    if (!selectedPeriodId || !hasDirtyRows) return
    mutation.mutate()
  }, [selectedPeriodId, hasDirtyRows, mutation])

  return {
    rows,
    periods: periodsData ?? [],
    selectedPeriodId,
    setSelectedPeriodId,
    handleDirtyChange,
    handleSave,
    hasDirtyRows,
    isSaving,
    isLoadingAccounts,
    isLoadingPeriods,
    error: mutation.error,
  }
}
