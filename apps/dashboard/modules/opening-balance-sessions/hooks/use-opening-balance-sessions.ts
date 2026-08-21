import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import {
  openingBalanceSessionResource,
  fiscalPeriodResource,
  cashboxResource,
  bankAccountResource,
  partyResource,
  currencyResource,
  accountResource,
} from "@devloggers/api-contracts"

export type SessionListItem = {
  id: string
  number: string
  status: string
  description: string | null
  fiscalPeriodId: string
  postedAt: string | null
  createdAt: string
}

export type OpeningSessionLineBody = {
  dimension: string
  accountId?: string | null
  partyId?: string | null
  cashboxId?: string | null
  bankAccountId?: string | null
  currencyId?: string | null
  partySide?: string | null
  amount: number
  exchangeRate?: number
}

export type CreateSessionBody = {
  fiscalPeriodId: string
  description?: string
  lines: OpeningSessionLineBody[]
}

export function useOpeningBalanceSessions() {
  const api = useApi()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const sessions = useQuery({
    queryKey: [openingBalanceSessionResource.key],
    queryFn: () => api[openingBalanceSessionResource.key].list({ page: 1, limit: 100 }),
    select: (res) => res?.data ?? [],
  })

  const periods = useQuery({
    queryKey: [fiscalPeriodResource.key],
    queryFn: () => api[fiscalPeriodResource.key].list(),
    select: (res) => (res?.data ?? []).filter((p) => p.status === "OPEN"),
  })

  const cashboxes = useQuery({
    queryKey: [cashboxResource.key],
    queryFn: () => api[cashboxResource.key].list({ page: 1, limit: 1000 }),
    select: (res) => res?.data ?? [],
  })

  const bankAccounts = useQuery({
    queryKey: [bankAccountResource.key],
    queryFn: () => api[bankAccountResource.key].list({ page: 1, limit: 1000 }),
    select: (res) => res?.data ?? [],
  })

  const parties = useQuery({
    queryKey: [partyResource.key],
    queryFn: () => api[partyResource.key].list({ page: 1, limit: 1000 }),
    select: (res) => res?.data ?? [],
  })

  const currencies = useQuery({
    queryKey: [currencyResource.key],
    queryFn: () => api[currencyResource.key].list({ page: 1, limit: 1000 }),
    select: (res) => res?.data ?? [],
  })

  const accounts = useQuery({
    queryKey: [accountResource.key],
    queryFn: () => api[accountResource.key].list({ page: 1, limit: 1000 }),
    select: (res) =>
      (res?.data ?? []).filter(
        (a) => ["ASSET", "LIABILITY", "EQUITY"].includes(a.type) && a.isActive,
      ),
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [openingBalanceSessionResource.key] })
  }, [queryClient])

  const createSession = useMutation({
    mutationFn: (body: CreateSessionBody) => api[openingBalanceSessionResource.key].create(body as never),
    onSuccess: () => {
      invalidate()
      setCreateOpen(false)
    },
  })

  const postSession = useMutation({
    mutationFn: async (id: string) => {
      await api[openingBalanceSessionResource.key].validate(id)
      await api[openingBalanceSessionResource.key].review(id)
      await api[openingBalanceSessionResource.key].post(id)
    },
    onSuccess: () => invalidate(),
  })

  const lockSession = useMutation({
    mutationFn: (id: string) => api[openingBalanceSessionResource.key].lock(id),
    onSuccess: () => invalidate(),
  })

  const busy = useMemo(
    () => createSession.isPending || postSession.isPending || lockSession.isPending,
    [createSession.isPending, postSession.isPending, lockSession.isPending],
  )

  return {
    sessions: sessions.data ?? [],
    isLoading: sessions.isLoading || periods.isLoading,
    createOpen,
    setCreateOpen,
    createSession,
    postSession,
    lockSession,
    busy,
    options: {
      periods: periods.data ?? [],
      cashboxes: cashboxes.data ?? [],
      bankAccounts: bankAccounts.data ?? [],
      parties: parties.data ?? [],
      currencies: currencies.data ?? [],
      accounts: accounts.data ?? [],
    },
  }
}