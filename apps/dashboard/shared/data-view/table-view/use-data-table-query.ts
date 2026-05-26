"use client"

import { useQueryStates } from "nuqs"
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import {
    listCrudData,
    type ICrudClient,
    type CrudListDataResponse,
} from "@devloggers/api-client"
import type { DataViewChangeEvent, DataViewPaginationState, DataViewSorting } from "./types"
import { dataViewSearchParams } from "./search-params"

export type UseDataViewQueryOptions<C extends ICrudClient> = {
    queryKey: string[]
    client: C
    queryOptions?: Omit<UseQueryOptions<CrudListDataResponse<C>>, "queryKey" | "queryFn">
    extraParams?: Record<string, unknown>
}

export function useDataViewQuery<C extends ICrudClient>({
    queryKey,
    client,
    queryOptions,
    extraParams,
}: UseDataViewQueryOptions<C>) {
    const [params, setParams] = useQueryStates(dataViewSearchParams)
    const resolvedQueryKey = [...queryKey, params, ...(extraParams ? [extraParams] : [])]
    const query = useQuery<CrudListDataResponse<C>>({
        queryKey: resolvedQueryKey,
        queryFn: () => {
            const apiParams: Record<string, unknown> = {
                page: params.page,
                limit: params.limit,
                ...extraParams,
            }
            if (params.sort_by) apiParams.sort_by = params.sort_by
            if (params.sort_order) apiParams.sort_order = params.sort_order

            return listCrudData(client, apiParams)
        },
        ...queryOptions,
    })

    const meta = query.data?.meta as { last_page?: number; total?: number } | undefined

    const pagination: DataViewPaginationState = {
        page: params.page,
        pageSize: params.limit,
        pageCount: meta?.last_page ?? 1,
        total: meta?.total ?? 0,
    }

    const sorting: DataViewSorting = params.sort_by
        ? [{ id: params.sort_by, desc: params.sort_order === "desc" }]
        : []

    const handleChange = (event: DataViewChangeEvent) => {
        switch (event.type) {
            case "pagination":
                setParams({
                    page: event.pagination.page,
                    limit: event.pagination.pageSize,
                })
                break
            case "sorting": {
                const sort = event.sorting[0]
                setParams({
                    sort_by: sort?.id ?? null,
                    sort_order: sort ? (sort.desc ? "desc" : "asc") : null,
                    page: 1,
                })
                break
            }
        }
    }

    const queryClient = useQueryClient()
    const invalidateQuery = () => {
        queryClient.invalidateQueries({ queryKey: resolvedQueryKey })
    }

    return {
        ...query,
        query,
        pagination,
        sorting,
        params,
        setParams,
        handleChange,
        invalidateQuery,
    }
}

export const useDataTableQuery = useDataViewQuery
