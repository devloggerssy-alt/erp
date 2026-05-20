import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react"
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import type {
    CrudCollectionClient,
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

// ── Core Types ──

export type ResourceItem<TClient extends CrudCollectionClient> = CrudListDataItem<TClient>

export type UseResourceOptions<TClient extends CrudCollectionClient> = {
    routeKey?: string
    getClient: (api: ApiInstance) => TClient
    queryOptions?: Omit<UseQueryOptions<CrudListDataResponse<TClient>>, "queryKey" | "queryFn">
    paramKey?: string
    extraParams?: Record<string, unknown>
}

export type ResourceTableHelpers<TClient extends CrudCollectionClient> = {
    actionsColumn: (
        options?: Partial<ActionsColumnOptions<ResourceItem<TClient>>>,
    ) => ColumnDef<ResourceItem<TClient>, unknown>
    openEdit: (row: ResourceItem<TClient>) => void
    deleteItem: (id: string) => Promise<unknown>
}

export type ResourceContext<TClient extends CrudCollectionClient> = ResourceTableHelpers<TClient> & {
    api: ApiInstance
    client: TClient
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
    handleChange: (event: DataViewChangeEvent) => void
    openCreate: () => void
    openDialog: (resourceId?: string) => void
    closeDialog: () => void
    invalidateQuery: () => void
}

export type ResourceColumns<TClient extends CrudCollectionClient> =
    | ColumnDef<ResourceItem<TClient>>[]
    | ((helpers: ResourceTableHelpers<TClient>) => ColumnDef<ResourceItem<TClient>>[])

export type ResourceRender<TClient extends CrudCollectionClient> = (
    resource: ResourceContext<TClient>,
) => ReactNode

export type ResourceDataViewComponent<TData> = ComponentType<DataViewProps<TData>>

export type ResourceFormProps<TClient extends CrudCollectionClient> = {
    resourceId: string | null
    initialData: ResourceItem<TClient> | null
    onSuccess: () => void
}

// ── Alias ──
export type ResourceContextValue<TClient extends CrudCollectionClient> = ResourceContext<TClient>

// ── Provider Config Alias ──
export type ResourceProviderConfig<TClient extends CrudCollectionClient> = UseResourceOptions<TClient>