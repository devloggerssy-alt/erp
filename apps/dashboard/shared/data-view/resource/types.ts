import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react"
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import type { CrudListItem, BaseCrudItem, CrudListResponse } from "@devloggers/api-client"
import type {
    ActionsColumnOptions,
    DataViewChangeEvent,
    DataViewPaginationState,
    DataViewProps,
    DataViewSorting,
} from "@/shared/data-view/table-view"
import type { useAuthApi } from "@/shared/useApi"

type ApiInstance = ReturnType<typeof useAuthApi>

export type ResourceClient = {
    list(query?: any): Promise<any>
    destroy(id: string): Promise<any>
}

export type ResourceQueryParams = {
    page: number
    per_page: number
    sort_by: string | null
    sort_order: "asc" | "desc" | null
}

export type ResourceItem<TClient> = CrudListItem<TClient> & BaseCrudItem

export type UseResourceOptions<TClient extends ResourceClient> = {
    routeKey: string
    getClient: (api: ApiInstance) => TClient
    queryOptions?: Omit<UseQueryOptions<CrudListResponse<TClient>>, "queryKey" | "queryFn">
    paramKey?: string
    extraParams?: Record<string, unknown>
}

export type ResourceTableHelpers<TClient extends ResourceClient> = {
    createActionsColumn: (
        options?: Partial<ActionsColumnOptions<ResourceItem<TClient>>>,
    ) => ColumnDef<ResourceItem<TClient>, unknown>
    actionsColumn: (
        options?: Partial<ActionsColumnOptions<ResourceItem<TClient>>>,
    ) => ColumnDef<ResourceItem<TClient>, unknown>
    openEdit: (row: ResourceItem<TClient>) => void
    deleteItem: (id: string) => Promise<unknown>
}

export type ResourceContext<TClient extends ResourceClient> = ResourceTableHelpers<TClient> & {
    api: ApiInstance
    client: TClient
    query: UseQueryResult<CrudListResponse<TClient>>
    data: CrudListResponse<TClient> | undefined
    items: ResourceItem<TClient>[]
    selectedItem: ResourceItem<TClient> | null
    setSelectedItem: Dispatch<SetStateAction<ResourceItem<TClient> | null>>
    isDialogOpen: boolean
    dialogResourceId: string | null
    isLoading: boolean
    isFetching: boolean
    pagination: DataViewPaginationState
    sorting: DataViewSorting
    params: ResourceQueryParams
    handleChange: (event: DataViewChangeEvent) => void
    openCreate: () => void
    openDialog: (resourceId?: string) => void
    closeDialog: () => void
    invalidateQuery: () => void
}

export type ResourceHeaderHelpers<TClient extends ResourceClient> = ResourceContext<TClient>

export type ResourceColumns<TClient extends ResourceClient> =
    | ColumnDef<ResourceItem<TClient>>[]
    | ((helpers: ResourceTableHelpers<TClient>) => ColumnDef<ResourceItem<TClient>>[])

export type ResourceRender<TClient extends ResourceClient> = (
    resource: ResourceContext<TClient>,
) => ReactNode

export type ResourceDataViewComponent<TData> = ComponentType<DataViewProps<TData>>

export type ResourceFormProps<TClient extends ResourceClient> = {
    resourceId: string | null
    initialData: ResourceItem<TClient> | null
    onSuccess: () => void
}