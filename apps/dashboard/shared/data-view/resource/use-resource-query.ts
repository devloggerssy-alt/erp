"use client"

import type { ICrudClient, CrudListDataResponse } from "@devloggers/api-client"
import type { UseQueryOptions } from "@tanstack/react-query"
import { useAuthApi } from "@/shared/useApi"
import { useDataViewQuery, type DataViewChangeEvent, type DataViewPaginationState, type DataViewSorting, type DataViewQueryParams } from "@/shared/data-view/table-view"
import type { ResourceItem, UseResourceOptions } from "./types"

type ApiInstance = ReturnType<typeof useAuthApi>

export type UseResourceQueryResult<TClient extends ICrudClient> = {
    api: ApiInstance
    client: TClient
    items: ResourceItem<TClient>[]
    isLoading: boolean
    isFetching: boolean
    query: import("@tanstack/react-query").UseQueryResult<CrudListDataResponse<TClient>>
    data: CrudListDataResponse<TClient> | undefined
    pagination: DataViewPaginationState
    sorting: DataViewSorting
    params: DataViewQueryParams
    handleChange: (event: DataViewChangeEvent) => void
    invalidateQuery: () => void
}

export function useResourceQuery<TClient extends ICrudClient>(
    config: UseResourceOptions<TClient>,
): UseResourceQueryResult<TClient> {
    const api = useAuthApi()
    const client = config.getClient(api)

    const queryState = useDataViewQuery({
        queryKey: [ client.key],
        client,
        queryOptions: config.queryOptions as Omit<UseQueryOptions<CrudListDataResponse<TClient>>, "queryKey" | "queryFn"> | undefined,
        extraParams: config.extraParams,
    })

    const items = Array.from(queryState.data?.data ?? []) as ResourceItem<TClient>[]

    return {
        api,
        client,
        items,
        isLoading: queryState.isLoading,
        isFetching: queryState.isFetching,
        query: queryState.query as import("@tanstack/react-query").UseQueryResult<CrudListDataResponse<TClient>>,
        data: queryState.data as CrudListDataResponse<TClient> | undefined,
        pagination: queryState.pagination,
        sorting: queryState.sorting,
        params: queryState.params,
        handleChange: queryState.handleChange,
        invalidateQuery: queryState.invalidateQuery,
    }
}