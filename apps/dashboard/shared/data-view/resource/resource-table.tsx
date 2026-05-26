"use client"

import type { ICrudClient } from "@devloggers/api-client"
import { DataTable } from "@/shared/data-view/table-view"
import type { ResourceColumns, ResourceItem } from "./types"
import { useResourceContext } from "./resource-context"

export type ResourceTableProps<TClient extends ICrudClient> = {
    columns: ResourceColumns<TClient>
    onRowClick?: (row: ResourceItem<TClient>) => void
}

export function ResourceTable<TClient extends ICrudClient>({
    columns: columnsProp,
    onRowClick,
}: ResourceTableProps<TClient>) {
    const resource = useResourceContext<TClient>()

    const columns = typeof columnsProp === "function"
        ? columnsProp({
            actionsColumn: resource.actionsColumn,
            openEdit: resource.openEdit,
            deleteItem: resource.deleteItem,
        })
        : columnsProp

    return (
        <DataTable
            columns={columns}
            data={resource.items}
            pagination={resource.pagination}
            sorting={resource.sorting}
            onChange={resource.handleChange}
            isLoading={resource.isLoading}
            onRowClick={onRowClick}
        />
    )
}