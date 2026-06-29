"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { ICrudClient } from "@devloggers/api-client"
import { useTranslations } from "next-intl"
import { createActionsColumn, type ActionsColumnOptions } from "@/shared/data-view/table-view"
import { useFormDialog } from "@/shared/components/form-dialog"
import { confirm } from "@/shared/components/confirm-dialog"
import type { ResourceContext, ResourceItem, UseResourceOptions } from "./types"
import { useResourceQuery } from "./use-resource-query"
import { useResourceMutations } from "./use-resource-mutations"

const resourceContext = createContext(null as unknown)

export function useResourceContext<TClient extends ICrudClient>(): ResourceContext<TClient> {
    const ctx = useContext(resourceContext)
    if (!ctx) {
        throw new Error("useResourceContext must be used within a <ResourceProvider>")
    }
    return ctx as unknown as ResourceContext<TClient>
}

export type ResourceProviderProps<TClient extends ICrudClient> = UseResourceOptions<TClient> & {
    children: ReactNode
}

export function ResourceProvider<TClient extends ICrudClient>({
    children,
    ...config
}: ResourceProviderProps<TClient>) {
    type TItem = ResourceItem<TClient>

    const queryState = useResourceQuery(config)
    const mutations = useResourceMutations(queryState.client, {
        invalidateQuery: queryState.invalidateQuery,
    })
    const t = useTranslations("system.resource")
    const dialog = useFormDialog(config.paramKey)
    const [selectedItem, setSelectedItem] = useState<TItem | null>(null)
    const [selectedItems, setSelectedItems] = useState<TItem[]>([])
    const clearSelection = () => setSelectedItems([])

    const openEdit = (row: TItem) => {
        setSelectedItem(row)
        dialog.open(String(row.id))
    }

    const openCreate = () => {
        setSelectedItem(null)
        dialog.open()
    }

    const actionsColumn = (
        options?: Partial<ActionsColumnOptions<TItem>>,
    ): ColumnDef<TItem, unknown> =>
        createActionsColumn<TItem>({
            onEdit: openEdit,
            onDelete: async (row) => {
                const confirmed = await confirm({
                    title: t("deleteTitle"),
                    description: t("deleteDescription"),
                    confirmLabel: t("deleteConfirm"),
                    variant: "destructive",
                })
                if (confirmed) {
                    await mutations.deleteItem(String(row.id))
                }
            },
            ...options,
        })

    const value: ResourceContext<TClient> = {
        api: queryState.api,
        client: queryState.client,
        paramKey: config.paramKey,
        list: config.list,
        query: queryState.query,
        data: queryState.data,
        items: queryState.items,
        isLoading: queryState.isLoading,
        isFetching: queryState.isFetching,
        pagination: queryState.pagination,
        sorting: queryState.sorting,
        params: queryState.params,
        setParams: queryState.setParams,
        filterOptions: queryState.filterOptions,
        handleChange: queryState.handleChange,
        invalidateQuery: queryState.invalidateQuery,
        deleteItem: mutations.deleteItem,
        selectedItem,
        setSelectedItem,
        selectedItems,
        setSelectedItems,
        clearSelection,
        isDialogOpen: dialog.isOpen,
        dialogResourceId: dialog.resourceId,
        openCreate,
        openEdit,
        openDialog: dialog.open,
        closeDialog: dialog.close,
        actionsColumn,
    }

    return (
        <resourceContext.Provider value={value as unknown as ResourceContext<ICrudClient>}>
            {children}
        </resourceContext.Provider>
    )
}