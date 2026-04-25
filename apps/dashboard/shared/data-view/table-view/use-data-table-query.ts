"use client"

import { useQueryStates } from "nuqs"
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import type { DataViewChangeEvent, DataViewPaginationState, DataViewSorting } from "./types"
import { dataTableSearchParams } from "./search-params"
import { type CrudListResponse } from "@devloggers/api-client"

type DataTableClient = {
    list(query?: any): Promise<any>
}

type UseDataTableQueryOptions<C extends DataTableClient> = {
    queryKey: string[]
    client: C
    queryOptions?: Omit<UseQueryOptions<CrudListResponse<C>>, "queryKey" | "queryFn">
    extraParams?: Record<string, unknown>
}

export function useDataTableQuery<C extends DataTableClient>({
    queryKey,
    client,
    queryOptions,
    extraParams,
}: UseDataTableQueryOptions<C>) {
    const [params, setParams] = useQueryStates(dataTableSearchParams)
    const _queryKey = [...queryKey, params, ...(extraParams ? [extraParams] : [])]
    const query = useQuery<CrudListResponse<C>>({
        queryKey: _queryKey,
        queryFn: () => {
            const apiParams: Record<string, unknown> = {
                page: params.page,
                per_page: params.per_page,
                ...extraParams,
            }
            if (params.sort_by) apiParams.sort_by = params.sort_by
            if (params.sort_order) apiParams.sort_order = params.sort_order

            return client.list(apiParams) as Promise<CrudListResponse<C>>
        },
        ...queryOptions,
    })

    const pagination: DataViewPaginationState = {
        page: params.page,
        pageSize: params.per_page,
        pageCount: (query.data as any)?.meta?.last_page ?? 1,
        total: (query.data as any)?.meta?.total ?? 0,
    }

    const sorting: DataViewSorting = params.sort_by
        ? [{ id: params.sort_by, desc: params.sort_order === "desc" }]
        : []

    const handleChange = (event: DataViewChangeEvent) => {
        switch (event.type) {
            case "pagination":
                setParams({
                    page: event.pagination.page,
                    per_page: event.pagination.pageSize,
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

    const queryClient = useQueryClient();
    const invalidateQuery = () => {
        queryClient.invalidateQueries({ queryKey: _queryKey })
    }

    return {
        ...query,
        pagination,
        sorting,
        params,
        setParams,
        handleChange,
        invalidateQuery,
    }
}
