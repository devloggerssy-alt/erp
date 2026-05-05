"use client"

import React from "react"
import { DataTable } from "@/shared/data-view/table-view"
import type {
    ResourceClient,
    ResourceColumns,
    ResourceContext,
    ResourceDataViewComponent,
    ResourceItem,
} from "./types"

export type ResourceTableViewProps<TClient extends ResourceClient> = {
    resource: ResourceContext<TClient>
    columns: ResourceColumns<TClient>
    view?: ResourceDataViewComponent<ResourceItem<TClient>>
    onRowClick?: (row: ResourceItem<TClient>) => void
}

export function ResourceTableView<TClient extends ResourceClient>({
    resource,
    columns: columnsProp,
    view: View = DataTable,
    onRowClick,
}: ResourceTableViewProps<TClient>) {
    const columns = typeof columnsProp === "function"
        ? columnsProp({
            createActionsColumn: resource.createActionsColumn,
            actionsColumn: resource.actionsColumn,
            openEdit: resource.openEdit,
            deleteItem: resource.deleteItem,
        })
        : columnsProp

    return (
        <View
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