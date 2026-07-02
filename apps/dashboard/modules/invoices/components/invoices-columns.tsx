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
import { MoreHorizontalIcon, SendIcon, XCircleIcon, PencilIcon, EyeIcon, Trash2Icon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type InvoiceItem = ResourceItem<InvoicesClient>
type ColumnTranslator = (key: string) => string

export type InvoiceColumnActions = {
    onOpenModal: (id: string) => void
    postInvoice: (id: string) => Promise<unknown>
    cancelInvoice: (id: string) => Promise<unknown>
    deleteInvoice: (id: string) => Promise<unknown>
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

function PaidStatusCell({ row, t }: { row: InvoiceItem; t: ColumnTranslator }) {
    if (row.status !== "POSTED") return <span className="text-muted-foreground">—</span>

    const paidStatus = row.paidStatus as string | undefined
    const amountPaid = row.amountPaid as number | undefined
    const total = row.total as number | undefined
    if (!paidStatus) return <span className="text-muted-foreground">—</span>

    return (
        <div className="flex flex-col gap-0.5">
            <Badge
                variant="outline"
                className={cn(
                    "w-fit font-medium text-xs",
                    paidStatus === "PAID" && "border-green-500 text-green-700 dark:text-green-400",
                    paidStatus === "PARTIAL" && "border-amber-500 text-amber-700 dark:text-amber-400",
                    paidStatus === "UNPAID" && "border-muted-foreground text-muted-foreground",
                )}
            >
                {paidStatus === "PAID"
                    ? t("paidStatus.paid")
                    : paidStatus === "PARTIAL"
                        ? t("paidStatus.partial")
                        : t("paidStatus.unpaid")}
            </Badge>
            {typeof amountPaid === "number" && typeof total === "number" && (
                <span className="text-xs text-muted-foreground tabular-nums">
                    {amountPaid.toLocaleString()} / {total.toLocaleString()}
                </span>
            )}
        </div>
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
    const status = row.status ?? ""
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
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => actions.deleteInvoice(id)}
                        >
                            <Trash2Icon className="me-2 h-4 w-4" />
                            {t("actions.delete")}
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
            accessorKey: "invoiceTypeName",
            header: ({ column }) => <ColumnHeader column={column} title={t("invoiceType")} />,
            cell: ({ row }) => {
                const name = row.original.invoiceTypeName
                return name ? <span>{name}</span> : <span className="text-muted-foreground">—</span>
            },
        },
        {
            accessorKey: "warehouseName",
            header: ({ column }) => <ColumnHeader column={column} title={t("warehouse")} />,
            cell: ({ row }) => {
                const name = row.original.warehouseName
                return name ? <span>{name}</span> : <span className="text-muted-foreground">—</span>
            },
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
            id: "paidStatus",
            header: () => <span className="text-xs text-muted-foreground">Paid</span>,
            cell: ({ row }) => <PaidStatusCell row={row.original} t={t} />,
        },
        {
            accessorKey: "total",
            header: ({ column }) => (
                <ColumnHeader column={column} title={t("totals.total")} className="text-end" />
            ),
            cell: ({ row }) => {
                const total = row.getValue("total") as number
                const currency = row.original.currencyCode ?? ""
                return (
                    <div className="font-medium tabular-nums">
                        {total?.toLocaleString()} {currency}
                    </div>
                )
            },
        },
        {
            accessorKey: "lineCount",
            header: () => <span className="text-xs text-muted-foreground">Lines</span>,
            cell: ({ row }) => {
                const count = row.original.lineCount
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
