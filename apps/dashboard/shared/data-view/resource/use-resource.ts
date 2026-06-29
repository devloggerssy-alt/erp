"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { confirm } from "@/shared/components/confirm-dialog"
import { useApi } from "@/shared/useApi"
import { useFormDialog } from "@/shared/components/form-dialog"
import {
    createActionsColumn,
    useDataViewQuery,
    parseFilterOptions,
    type ActionsColumnOptions,
} from "@/shared/data-view/table-view"
import type { ColumnDef } from "@tanstack/react-table"
import type { ICrudClient } from "@devloggers/api-client"
import type {
    ResourceContext,
    ResourceItem,
    UseResourceOptions,
} from "./types"

export function useResource<TClient extends ICrudClient>({
    getClient,
    queryOptions,
    paramKey,
    extraParams,
    list,
}: UseResourceOptions<TClient>): ResourceContext<TClient> {
    type TItem = ResourceItem<TClient>

    const api = useApi()
    const t = useTranslations("system.resource")
    const client = getClient(api)
    const { open: openDialog, close: closeDialog, isOpen, resourceId } = useFormDialog(paramKey)
    const [selectedItem, setSelectedItem] = useState<TItem | null>(null)
    const [selectedItems, setSelectedItems] = useState<TItem[]>([])
    const clearSelection = () => setSelectedItems([])

    const query = useDataViewQuery({
        queryKey: [client.key],
        client,
        queryOptions,
        extraParams,
        list: list ? { searchIn: list.searchIn } : undefined,
    })

    const data = query.data
    const items = Array.from(data?.data ?? [])
    const filterOptions = parseFilterOptions(data?.meta)

    const { mutateAsync: deleteItem } = useMutation({
        mutationFn: (id: string) => {
            const promise = client.destroy(id)
            toast.promise(promise, {
                loading: t("toastDeleting"),
                success: t("toastDeleted"),
                error: t("toastDeleteFailed"),
            })
            return promise
        },
        onSuccess: () => query.invalidateQuery(),
    })

    const openEdit = (row: TItem) => {
        setSelectedItem(row)
        openDialog(String(row.id))
    }

    const openCreate = () => {
        setSelectedItem(null)
        openDialog()
    }

    const buildActionsColumn = (
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
                    await deleteItem(String(row.id))
                }
            },
            ...options,
        })

    return {
        api,
        client,
        paramKey,
        list,
        query: query.query,
        data,
        items,
        selectedItem,
        setSelectedItem,
        selectedItems,
        setSelectedItems,
        clearSelection,
        isDialogOpen: isOpen,
        dialogResourceId: resourceId,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        pagination: query.pagination,
        sorting: query.sorting,
        params: query.params,
        setParams: query.setParams,
        filterOptions,
        handleChange: query.handleChange,
        openCreate,
        openEdit,
        openDialog,
        closeDialog,
        deleteItem,
        invalidateQuery: query.invalidateQuery,
        actionsColumn: buildActionsColumn,
    }
}
