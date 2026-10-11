"use client"

import { useMemo } from "react"
import { keepPreviousData } from "@tanstack/react-query"
import { useCrudList } from "@devloggers/api-client/react"
import { useApi } from "@/shared/useApi"
import { useAuthStore } from "@/shared/stores/auth-store"
import { useDebouncedValue } from "./use-debounced-value"

export const GLOBAL_SEARCH_MIN_REMOTE_LENGTH = 2
export const GLOBAL_SEARCH_RESULT_LIMIT = 5
export const GLOBAL_SEARCH_DEBOUNCE_MS = 300

const RESULT_STALE_TIME = 30_000

export function useGlobalSearch(query: string) {
    const api = useApi()
    const permissions = useAuthStore((state) => state.user?.permissions)
    const granted = useMemo(() => new Set(permissions ?? []), [permissions])

    const debouncedQuery = useDebouncedValue(query.trim(), GLOBAL_SEARCH_DEBOUNCE_MS)
    const remoteEnabled = debouncedQuery.length >= GLOBAL_SEARCH_MIN_REMOTE_LENGTH

    const queryOptions = {
        enabled: remoteEnabled,
        staleTime: RESULT_STALE_TIME,
        placeholderData: keepPreviousData,
    }

    const itemsQuery = useCrudList(api.items, {
        query: {
            search: debouncedQuery,
            searchIn: "name,code,barcode",
            page: 1,
            limit: GLOBAL_SEARCH_RESULT_LIMIT,
        },
        queryOptions: { ...queryOptions, enabled: queryOptions.enabled && granted.has("items.view") },
    })

    const invoicesQuery = useCrudList(api.invoices, {
        query: {
            search: debouncedQuery,
            searchIn: "number,partyName",
            page: 1,
            limit: GLOBAL_SEARCH_RESULT_LIMIT,
        },
        queryOptions: { ...queryOptions, enabled: queryOptions.enabled && granted.has("invoices.view") },
    })

    const partiesQuery = useCrudList(api.parties, {
        query: {
            search: debouncedQuery,
            searchIn: "name,code,phone,email",
            page: 1,
            limit: GLOBAL_SEARCH_RESULT_LIMIT,
        },
        queryOptions: { ...queryOptions, enabled: queryOptions.enabled && granted.has("parties.view") },
    })

    const paymentsQuery = useCrudList(api.payments, {
        query: {
            search: debouncedQuery,
            searchIn: "number",
            page: 1,
            limit: GLOBAL_SEARCH_RESULT_LIMIT,
        },
        queryOptions: { ...queryOptions, enabled: queryOptions.enabled && granted.has("payments.view") },
    })

    return {
        granted,
        debouncedQuery,
        remoteEnabled,
        items: itemsQuery.data?.data ?? [],
        invoices: invoicesQuery.data?.data ?? [],
        parties: partiesQuery.data?.data ?? [],
        payments: paymentsQuery.data?.data ?? [],
        isFetching:
            itemsQuery.isFetching ||
            invoicesQuery.isFetching ||
            partiesQuery.isFetching ||
            paymentsQuery.isFetching,
    }
}
