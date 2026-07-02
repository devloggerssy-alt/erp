"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { StockCountsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { MoreHorizontal, Send } from "lucide-react"

type ColumnTranslator = (key: string) => string

export type StockCountColumnActions = {
    postStockCount: (id: string) => Promise<unknown>
}

function StatusBadge({ status }: { status: string }) {
    const variant =
        status === "POSTED" ? "default" :
        status === "CANCELLED" ? "destructive" :
        "secondary"
    return <Badge variant={variant}>{status}</Badge>
}

function StockCountActionsCell({
    row,
    t,
    actions,
}: {
    row: ResourceItem<StockCountsClient>
    t: ColumnTranslator
    actions: StockCountColumnActions
}) {
    if (row.status !== "DRAFT") return null
    const id = String(row.id)

    return (
        <div className="flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">{t("actions.post")}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => actions.postStockCount(id)}>
                        <Send className="me-2 size-4" />
                        {t("actions.post")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

export function createStockCountsColumns(
    _helpers: ResourceTableHelpers<StockCountsClient>,
    t: ColumnTranslator,
    actions: StockCountColumnActions,
): ColumnDef<ResourceItem<StockCountsClient>>[] {
    return [
        {
            accessorKey: "number",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("number")} />,
        },
        {
            accessorKey: "date",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("date")} />,
            cell: ({ row }) => {
                const val = row.getValue("date") as string
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
        {
            accessorKey: "warehouseName",
            header: ({ column }) => <ColumnHeader column={column} title={t("warehouse")} />,
        },
        {
            accessorKey: "status",
            header: ({ column }) => <ColumnHeader column={column} title={t("status")} />,
            cell: ({ row }) => <StatusBadge status={row.getValue("status") as string} />,
        },
        {
            accessorKey: "lineCount",
            header: ({ column }) => <ColumnHeader column={column} title={t("lineCount")} />,
        },
        {
            accessorKey: "createdAt",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("createdAt")} />,
            cell: ({ row }) => {
                const val = row.getValue("createdAt") as string
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
        {
            id: "actions",
            cell: ({ row }) => <StockCountActionsCell row={row.original} t={t} actions={actions} />,
        },
    ]
}
