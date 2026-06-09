"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { InvoicesClient } from "@devloggers/api-client"
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
import { MoreHorizontalIcon, SendIcon, XCircleIcon, PencilIcon, EyeIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type InvoiceItem = ResourceItem<InvoicesClient>
type ColumnTranslator = (key: string) => string

export type InvoiceColumnActions = {
    onOpenModal: (id: string) => void
    postInvoice: (id: string) => Promise<void>
    cancelInvoice: (id: string) => Promise<void>
}

function StatusBadge({ status, t }: { status: string; t: ColumnTranslator }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                "font-medium text-xs",
                status === "POSTED" && "border-green-500 text-green-700 dark:text-green-400",
                status === "CANCELLED" && "border-destructive text-destructive",
                status === "DRAFT" && "border-muted-foreground text-muted-foreground",
            )}
        >
            {status === "POSTED"
                ? t("status.posted")
                : status === "CANCELLED"
                    ? t("status.cancelled")
                    : t("status.draft")}
        </Badge>
    )
}

function InvoiceActionsCell({
    row,
    t,
    actions,
}: {
    row: InvoiceItem
    t: ColumnTranslator
    actions: InvoiceColumnActions
}) {
    const status = (row as any).status as string
    const id = String(row.id)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                    <MoreHorizontalIcon className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {status === "DRAFT" && (
                    <>
                        <DropdownMenuItem onClick={() => actions.onOpenModal(id)}>
                            <PencilIcon className="me-2 h-4 w-4" />
                            {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => actions.postInvoice(id)}>
                            <SendIcon className="me-2 h-4 w-4" />
                            {t("actions.post")}
                        </DropdownMenuItem>
                    </>
                )}
                {status === "POSTED" && (
                    <>
                        <DropdownMenuItem onClick={() => actions.onOpenModal(id)}>
                            <EyeIcon className="me-2 h-4 w-4" />
                            {t("actions.view")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => actions.cancelInvoice(id)}
                        >
                            <XCircleIcon className="me-2 h-4 w-4" />
                            {t("actions.cancel")}
                        </DropdownMenuItem>
                    </>
                )}
                {status === "CANCELLED" && (
                    <DropdownMenuItem onClick={() => actions.onOpenModal(id)}>
                        <EyeIcon className="me-2 h-4 w-4" />
                        {t("actions.view")}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function createInvoicesColumns(
    _helpers: ResourceTableHelpers<InvoicesClient>,
    t: ColumnTranslator,
    actions: InvoiceColumnActions,
): ColumnDef<InvoiceItem>[] {
    return [
        {
            accessorKey: "number",
            header: ({ column }) => <ColumnHeader column={column} title={t("number")} />,
            cell: ({ row }) => (
                <span className="font-mono font-semibold text-sm">{row.getValue("number")}</span>
            ),
        },
        {
            accessorKey: "partyName",
            header: ({ column }) => <ColumnHeader column={column} title={t("party")} />,
        },
        {
            accessorKey: "date",
            header: ({ column }) => <ColumnHeader column={column} title={t("date")} />,
            cell: ({ row }) => {
                const val = row.getValue("date") as string
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
        {
            accessorKey: "dueDate",
            header: ({ column }) => <ColumnHeader column={column} title={t("dueDate")} />,
            cell: ({ row }) => {
                const val = row.getValue("dueDate") as string | null
                return val ? (
                    <span>{new Date(val).toLocaleDateString()}</span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => <ColumnHeader column={column} title="Status" />,
            cell: ({ row }) => <StatusBadge status={row.getValue("status")} t={t} />,
        },
        {
            accessorKey: "total",
            header: ({ column }) => (
                <ColumnHeader column={column} title={t("totals.total")} className="text-end" />
            ),
            cell: ({ row }) => {
                const total = row.getValue("total") as number
                const currency = (row.original as any).currencyCode ?? ""
                return (
                    <div className="text-end font-medium tabular-nums">
                        {total?.toLocaleString()} {currency}
                    </div>
                )
            },
        },
        {
            accessorKey: "lineCount",
            header: () => <span className="text-xs text-muted-foreground">Lines</span>,
            cell: ({ row }) => {
                const count = (row.original as any).lineCount as number | undefined
                return count !== undefined ? (
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                ) : null
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <InvoiceActionsCell row={row.original} t={t} actions={actions} />
            ),
        },
    ]
}
