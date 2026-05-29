import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react"
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import type {
    ICrudClient,
    CrudListDataResponse,
    CrudListDataItem,
} from "@devloggers/api-client"
import type {
    ActionsColumnOptions,
    DataViewChangeEvent,
    DataViewPaginationState,
    DataViewQueryParams,
    DataViewProps,
    DataViewSorting,
} from "@/shared/data-view/table-view"
import type { useAuthApi } from "@/shared/useApi"

type ApiInstance = ReturnType<typeof useAuthApi>

export type ResourceListConfig = {
    searchIn?: string[]
    defaultSort?: { field: string; order: "asc" | "desc" }
    pageSize?: number
}

export type ResourceItem<TClient extends ICrudClient> = CrudListDataItem<TClient>

export type UseResourceOptions<TClient extends ICrudClient> = {
    getClient: (api: ApiInstance) => TClient
    queryOptions?: Omit<UseQueryOptions<CrudListDataResponse<TClient>>, "queryKey" | "queryFn">
    paramKey?: string
    extraParams?: Record<string, unknown>
    list?: ResourceListConfig
}

export type ResourceTableHelpers<TClient extends ICrudClient> = {
    actionsColumn: (
        options?: Partial<ActionsColumnOptions<ResourceItem<TClient>>>,
    ) => ColumnDef<ResourceItem<TClient>, unknown>
    openEdit: (row: ResourceItem<TClient>) => void
    deleteItem: (id: string) => Promise<unknown>
}

export type ResourceContext<TClient extends ICrudClient> = ResourceTableHelpers<TClient> & {
    api: ApiInstance
    client: TClient
    paramKey?: string
    list?: ResourceListConfig
    query: UseQueryResult<CrudListDataResponse<TClient>>
    data: CrudListDataResponse<TClient> | undefined
    items: ResourceItem<TClient>[]
    selectedItem: ResourceItem<TClient> | null
    setSelectedItem: Dispatch<SetStateAction<ResourceItem<TClient> | null>>
    isDialogOpen: boolean
    dialogResourceId: string | null
    isLoading: boolean
    isFetching: boolean
    pagination: DataViewPaginationState
    sorting: DataViewSorting
    params: DataViewQueryParams
    setParams: (params: Partial<DataViewQueryParams>) => void
    handleChange: (event: DataViewChangeEvent) => void
    openCreate: () => void
    openDialog: (resourceId?: string) => void
    closeDialog: () => void
    invalidateQuery: () => void
}

export type ResourceColumns<TClient extends ICrudClient> =
    | ColumnDef<ResourceItem<TClient>>[]
    | ((helpers: ResourceTableHelpers<TClient>) => ColumnDef<ResourceItem<TClient>>[])

export type ResourceRender<TClient extends ICrudClient> = (
    resource: ResourceContext<TClient>,
) => ReactNode

export type ResourceDataViewComponent<TData> = ComponentType<DataViewProps<TData>>

export type ResourceFormProps<TClient extends ICrudClient> = {
    resourceId: string | null
    initialData: ResourceItem<TClient> | null
    onSuccess: () => void
}

export type ResourceContextValue<TClient extends ICrudClient> = ResourceContext<TClient>

export type ResourceProviderConfig<TClient extends ICrudClient> = UseResourceOptions<TClient>
