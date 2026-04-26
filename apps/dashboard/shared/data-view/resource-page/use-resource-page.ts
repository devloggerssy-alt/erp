"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { confirm } from "@/shared/components/confirm-dialog"
import { useAuthApi } from "@/shared/useApi"
import { useFormDialog } from "@/shared/components/form-dialog"
import { useDataTableQuery, createActionsColumn, type ActionsColumnOptions } from "@/shared/data-view/table-view"
import type { ColumnDef } from "@tanstack/react-table"
import type { CrudListItem, BaseCrudItem, CrudListResponse } from "@garage/api"
import type { UseQueryOptions } from "@tanstack/react-query"

type ApiInstance = ReturnType<typeof useAuthApi>

export type ResourcePageClient = {
    list(query?: any): Promise<any>
    destroy(id: string): Promise<any>
}

export type ResourceItem<TClient> = CrudListItem<TClient> & BaseCrudItem

export type UseResourcePageOptions<TClient extends ResourcePageClient> = {
    routeKey: string
    getClient: (api: ApiInstance) => TClient
    queryOptions?: Omit<UseQueryOptions<CrudListResponse<TClient>>, "queryKey" | "queryFn">
    paramKey?: string
    extraParams?: Record<string, unknown>
}

export function useResourcePage<TClient extends ResourcePageClient>({
    routeKey,
    getClient,
    queryOptions,
    paramKey,
    extraParams,
}: UseResourcePageOptions<TClient>) {
    type TItem = ResourceItem<TClient>

    const api = useAuthApi()
    const client = getClient(api)
    const { open: openDialog, close: closeDialog, isOpen, resourceId } = useFormDialog(paramKey)
    const [selectedItem, setSelectedItem] = useState<TItem | null>(null)

    const tableQuery = useDataTableQuery({
        queryKey: [routeKey],
        client,
        queryOptions,
        extraParams,
    })

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
        onSuccess: () => tableQuery.invalidateQuery(),
    })

    const openEdit = (row: TItem) => {
        setSelectedItem(row)
        openDialog(String(row.id))
    }

    const openCreate = () => {
        setSelectedItem(null)
        openDialog()
    }

    const actionsColumn = (options?: Partial<ActionsColumnOptions<TItem>>): ColumnDef<TItem, unknown> =>
        createActionsColumn<TItem>({
            onEdit: (row) => openEdit(row),
            onDelete: async (row) => {
                const confirmed = await confirm({
                    title: "Delete this item?",
                    description: "This action cannot be undone.",
                    confirmLabel: "Delete",
                    variant: "destructive",
                })
                if (confirmed) await deleteItem(String(row.id))
            },
            ...options,
        })

    return {
        api,
        client,
        isDialogOpen: isOpen,
        dialogResourceId: resourceId,
        selectedItem,
        setSelectedItem,
        openEdit,
        openCreate,
        openDialog,
        closeDialog,
        ...tableQuery,
        deleteItem,
        actionsColumn,
    }
}
