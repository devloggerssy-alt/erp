import type { ColumnDef, SortingState } from "@tanstack/react-table"
import type { ReactNode } from "react"

export type DataViewPaginationState = {
    page: number
    pageSize: number
    pageCount: number
    total: number
}

export type DataViewSorting = SortingState

export type DataViewState = {
    pagination: DataViewPaginationState
    sorting: DataViewSorting
}

export type DataViewChangeEvent =
    | { type: "pagination"; pagination: DataViewPaginationState }
    | { type: "sorting"; sorting: DataViewSorting }

export type DataViewSlots = {
    actions?: ReactNode
    extraHeader?: ReactNode
    extraBody?: ReactNode
    footer?: ReactNode
}

export type DataViewProps<TData> = {
    columns: ColumnDef<TData, any>[]
    data: TData[]
    pagination: DataViewPaginationState
    sorting?: DataViewSorting
    onChange: (event: DataViewChangeEvent) => void
    isLoading?: boolean
    onRowClick?: (row: TData) => void
    slots?: DataViewSlots
}
