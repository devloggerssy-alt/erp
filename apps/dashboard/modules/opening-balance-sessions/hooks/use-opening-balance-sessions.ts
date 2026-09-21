"use client"

import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useApi } from "@/shared/useApi"
import { toastErrorMessage } from "@/shared/lib/utils"
import {
  openingBalanceSessionResource,
  fiscalPeriodResource,
  cashboxResource,
  bankAccountResource,
  partyResource,
  currencyResource,
  accountResource,
  type ApiResponse,
} from "@devloggers/api-contracts"
import {
  postingStepsFor,
  type CreateOpeningSessionBody,
  type OpeningSessionLineBody,
  type UpdateOpeningSessionBody,
} from "../opening-balance-sessions.utils"

export type { CreateOpeningSessionBody, OpeningSessionLineBody, UpdateOpeningSessionBody }
export type CreateSessionBody = CreateOpeningSessionBody

type ListResponse = ApiResponse<typeof openingBalanceSessionResource.routes.list, "get">
export type OpeningSessionListItem = NonNullable<ListResponse["data"]>[number]
export type OpeningSessionStatus = OpeningSessionListItem["status"]

type ShowResponse = ApiResponse<typeof openingBalanceSessionResource.routes.show, "get">
export type OpeningSessionDetail = NonNullable<ShowResponse["data"]>

type PreviewResponse = ApiResponse<typeof openingBalanceSessionResource.routes.preview, "get">
export type OpeningSessionPreview = NonNullable<PreviewResponse["data"]>

/** Back-compat alias for the old single-line page. */
export type SessionListItem = OpeningSessionListItem

export function useOpeningSessionDetail(sessionId: string | null, enabled: boolean) {
  const api = useApi()
  const query = useQuery({
    queryKey: [openingBalanceSessionResource.key, "detail", sessionId],
    queryFn: () => api[openingBalanceSessionResource.key].show(sessionId as string),
    select: (res) => res?.data ?? null,
    enabled: enabled && sessionId !== null,
  })
  return { detail: query.data ?? null, isLoading: query.isLoading }
}

export function useOpeningSessionPreview(sessionId: string | null) {
  const api = useApi()
  const query = useQuery({
    queryKey: [openingBalanceSessionResource.key, "preview", sessionId],
    queryFn: () => api[openingBalanceSessionResource.key].preview(sessionId as string),
    select: (res) => res?.data ?? null,
    enabled: sessionId !== null,
    retry: false,
  })
  return { preview: query.data ?? null, isLoading: query.isLoading, error: query.error as Error | null }
}

export function useOpeningBalanceSessions() {
  const api = useApi()
  const queryClient = useQueryClient()
  const t = useTranslations("business.resources.openingBalanceSessions")
  const client = api[openingBalanceSessionResource.key]

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [postingSessionId, setPostingSessionId] = useState<string | null>(null)

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [openingBalanceSessionResource.key] })
  }, [queryClient])

  const sessions = useQuery({
    queryKey: [openingBalanceSessionResource.key, "list"],
    queryFn: () => client.list({ page: 1, limit: 100 }),
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

  const createSession = useMutation({
    mutationFn: (body: CreateOpeningSessionBody) => client.create(body),
    onSuccess: (res) => {
      invalidate()
      const created = res?.data
      if (created?.id) setEditingSessionId(created.id)
    },
    onError: (error) => toast.error(toastErrorMessage(error, t("saveError"))),
  })

  const updateSession = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOpeningSessionBody }) => client.update(id, body),
    onSuccess: invalidate,
    onError: (error) => toast.error(toastErrorMessage(error, t("saveError"))),
  })

  const deleteSession = useMutation({
    mutationFn: (id: string) => client.destroy(id),
    onSuccess: () => {
      invalidate()
      setEditorOpen(false)
      setEditingSessionId(null)
    },
    onError: (error) => toast.error(toastErrorMessage(error, t("deleteError"))),
  })

  const postSession = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OpeningSessionStatus }) => {
      for (const step of postingStepsFor(status)) {
        if (step === "validate") await client.validate(id)
        else if (step === "review") await client.review(id)
        else await client.post(id)
      }
    },
    onSuccess: () => {
      invalidate()
      setPostingSessionId(null)
      toast.success(t("postDone"))
    },
    onError: (error) => toast.error(toastErrorMessage(error, t("postError"))),
  })

  const lockSession = useMutation({
    mutationFn: (id: string) => client.lock(id),
    onSuccess: () => {
      invalidate()
      toast.success(t("lockDone"))
    },
    onError: (error) => toast.error(toastErrorMessage(error, t("lockError"))),
  })

  const openCreate = useCallback(() => {
    setEditingSessionId(null)
    setEditorOpen(true)
  }, [])

  const openEditor = useCallback((sessionId: string) => {
    setEditingSessionId(sessionId)
    setEditorOpen(true)
  }, [])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setEditingSessionId(null)
  }, [])

  const openPostDialog = useCallback((sessionId: string) => setPostingSessionId(sessionId), [])
  const closePostDialog = useCallback(() => setPostingSessionId(null), [])

  const postingSession = useMemo(
    () => (sessions.data ?? []).find((session) => session.id === postingSessionId) ?? null,
    [sessions.data, postingSessionId],
  )

  const busy = useMemo(
    () =>
      createSession.isPending ||
      updateSession.isPending ||
      deleteSession.isPending ||
      postSession.isPending ||
      lockSession.isPending,
    [
      createSession.isPending,
      updateSession.isPending,
      deleteSession.isPending,
      postSession.isPending,
      lockSession.isPending,
    ],
  )

  return {
    sessions: sessions.data ?? [],
    isLoading: sessions.isLoading || periods.isLoading,
    options: {
      periods: periods.data ?? [],
      cashboxes: cashboxes.data ?? [],
      bankAccounts: bankAccounts.data ?? [],
      parties: parties.data ?? [],
      currencies: currencies.data ?? [],
      accounts: accounts.data ?? [],
    },
    createSession,
    updateSession,
    deleteSession,
    postSession,
    lockSession,
    busy,
    editorOpen,
    editingSessionId,
    openCreate,
    openEditor,
    closeEditor,
    postingSessionId,
    postingSession,
    openPostDialog,
    closePostDialog,
    // Back-compat with the pre-10.2 page (removed in Task 9).
    createOpen: editorOpen,
    setCreateOpen: (open: boolean) => (open ? openCreate() : closeEditor()),
  }
}
