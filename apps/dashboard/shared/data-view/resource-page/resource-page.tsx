"use client"

import React from "react"
import DashboardPage from "@/base/components/layout/dashboard/dashboard-page"
import type { DashboardHeaderProps } from "@/base/components/layout/dashboard"
import { Card, CardContent } from "@/shared/components/ui/card"
import { DataTable, type ActionsColumnOptions } from "@/shared/data-view/table-view"
import { useResourcePage, type UseResourcePageOptions, type ResourceItem, type ResourcePageClient } from "./use-resource-page"
import type { ColumnDef } from "@tanstack/react-table"

export type ResourceFormProps<TClient extends ResourcePageClient> = {
    resourceId: string | null
    initialData: ResourceItem<TClient> | null
    onSuccess: () => void
}

export type ResourcePageHeaderHelpers<TClient extends ResourcePageClient> = {
    selectedItem: ResourceItem<TClient> | null
    invalidateQuery: () => void
}

export type ResourcePageColumnHelpers<TClient extends ResourcePageClient> = {
    actionsColumn: (options?: Partial<ActionsColumnOptions<ResourceItem<TClient>>>) => ColumnDef<ResourceItem<TClient>, unknown>
    openEdit: (row: ResourceItem<TClient>) => void
    deleteItem: (id: string) => Promise<unknown>
}

export type ResourcePageContext<TClient extends ResourcePageClient> = {
    selectedItem: ResourceItem<TClient> | null
    isDialogOpen: boolean
    dialogResourceId: string | null
    isLoading: boolean
    data: ResourceItem<TClient>[]
    openCreate: () => void
    openEdit: (row: ResourceItem<TClient>) => void
    closeDialog: () => void
    deleteItem: (id: string) => Promise<unknown>
    invalidateQuery: () => void
}

type ReactNodeOrRender<TClient extends ResourcePageClient> =
    | React.ReactNode
    | ((context: ResourcePageContext<TClient>) => React.ReactNode)

export type ResourcePageProps<TClient extends ResourcePageClient> = UseResourcePageOptions<TClient> & {
    columns: ColumnDef<ResourceItem<TClient>>[] | ((helpers: ResourcePageColumnHelpers<TClient>) => ColumnDef<ResourceItem<TClient>>[])
    headerProps?: DashboardHeaderProps | ((helpers: ResourcePageHeaderHelpers<TClient>) => DashboardHeaderProps)
    header?: ReactNodeOrRender<TClient> | null
    pageTitle?: string
    paramKey?: string
    onRowClick?: (row: ResourceItem<TClient>) => void
    toolbar?: ReactNodeOrRender<TClient>

}

export function ResourcePage<TClient extends ResourcePageClient>({
    columns: columnsProp,
    headerProps: headerPropsProp,
    header,
    pageTitle,
    routeKey,
    getClient,
    queryOptions,
    paramKey,
    onRowClick,
    toolbar,
    extraParams,
}: ResourcePageProps<TClient>) {
    type TItem = ResourceItem<TClient>
    const page = useResourcePage<TClient>({ routeKey, getClient, queryOptions, paramKey, extraParams })

    const columns = typeof columnsProp === "function"
        ? columnsProp({
            actionsColumn: page.actionsColumn,
            openEdit: page.openEdit,
            deleteItem: page.deleteItem,
        })
        : columnsProp

    type ListResponse = { data?: TItem[] }
    const responseData = page.data as ListResponse | undefined
    const items = (responseData?.data ?? []) as TItem[]

    const context: ResourcePageContext<TClient> = {
        selectedItem: page.selectedItem,
        isDialogOpen: page.isDialogOpen,
        dialogResourceId: page.dialogResourceId,
        isLoading: page.isLoading,
        data: items,
        openCreate: page.openCreate,
        openEdit: page.openEdit,
        closeDialog: page.closeDialog,
        deleteItem: page.deleteItem,
        invalidateQuery: () => page.invalidateQuery(),
    }

    const resolvedHeaderProps = typeof headerPropsProp === "function"
        ? headerPropsProp({
            selectedItem: page.selectedItem,
            invalidateQuery: () => page.invalidateQuery(),
        })
        : headerPropsProp

    const resolvedHeader = typeof header === "function" ? header(context) : header
    const resolvedToolbar = typeof toolbar === "function" ? toolbar(context) : toolbar

    return (
        <DashboardPage
            header={resolvedHeader}
            headerProps={resolvedHeaderProps}
            title={pageTitle}
            toolbar={resolvedToolbar}
        >
            <Card>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={items}
                        pagination={page.pagination}
                        sorting={page.sorting}
                        onChange={page.handleChange}
                        isLoading={page.isLoading}
                        onRowClick={onRowClick}
                    />
                </CardContent>
            </Card>
        </DashboardPage>
    )
}
