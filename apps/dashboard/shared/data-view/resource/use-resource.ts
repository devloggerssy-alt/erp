"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { confirm } from "@/shared/components/confirm-dialog"
import { useAuthApi } from "@/shared/useApi"
import { useFormDialog } from "@/shared/components/form-dialog"
import {
    createActionsColumn,
    useDataViewQuery,
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
    routeKey,
    getClient,
    queryOptions,
    paramKey,
    extraParams,
}: UseResourceOptions<TClient>): ResourceContext<TClient> {
    type TItem = ResourceItem<TClient>

    const api = useAuthApi()
    const client = getClient(api)
    const { open: openDialog, close: closeDialog, isOpen, resourceId } = useFormDialog(paramKey)
    const [selectedItem, setSelectedItem] = useState<TItem | null>(null)

    const query = useDataViewQuery({
        queryKey: [routeKey ?? client.key],
        client,
        queryOptions,
        extraParams,
    })

    const data = query.data
    const items = Array.from(data?.data ?? [])

    const { mutateAsync: deleteItem } = useMutation({
        mutationFn: (id: string) => {
            const promise = client.destroy(id)
            toast.promise(promise, {
                loading: "Deleting...",
                success: "Deleted successfully",
                error: "Failed to delete",
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
                    title: "Delete this item?",
                    description: "This action cannot be undone.",
                    confirmLabel: "Delete",
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
        query: query.query,
        data,
        items,
        selectedItem,
        setSelectedItem,
        isDialogOpen: isOpen,
        dialogResourceId: resourceId,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        pagination: query.pagination,
        sorting: query.sorting,
        params: query.params,
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