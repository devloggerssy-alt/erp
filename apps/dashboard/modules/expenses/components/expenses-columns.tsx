"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { ExpensesClient } from "@devloggers/api-client"
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

type ExpenseItem = ResourceItem<ExpensesClient>
type ColumnTranslator = (key: string) => string

export type ExpenseColumnActions = {
    onOpenModal: (id: string) => void
    postExpense: (id: string) => Promise<void>
    cancelExpense: (id: string) => Promise<void>
}

function ExpenseActionsCell({
    row,
    t,
    actions,
}: {
    row: ExpenseItem
    t: ColumnTranslator
    actions: ExpenseColumnActions
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
                        <DropdownMenuItem onClick={() => actions.postExpense(id)}>
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
                            onClick={() => actions.cancelExpense(id)}
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

export function createExpensesColumns(
    _helpers: ResourceTableHelpers<ExpensesClient>,
    t: ColumnTranslator,
    actions: ExpenseColumnActions,
): ColumnDef<any>[] {
    return [
        {
            accessorKey: "number",
            header: ({ column }) => <ColumnHeader column={column} title={t("number")} />,
            cell: ({ row }) => (
                <span className="font-mono font-semibold text-sm">{row.getValue("number")}</span>
            ),
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
            id: "cashboxCode",
            header: ({ column }) => <ColumnHeader column={column} title={t("cashbox")} />,
            cell: ({ row }) => {
                const cashbox = (row.original as any).cashbox
                return cashbox?.code
                    ? <span className="font-mono text-sm">{cashbox.code}</span>
                    : <span className="text-muted-foreground">—</span>
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => <ColumnHeader column={column} title={t("status")} />,
            cell: ({ row }) => {
                const status = row.getValue("status") as string
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
            },
        },
        {
            accessorKey: "totalAmount",
            header: ({ column }) => (
                <ColumnHeader column={column} title={t("total")} className="text-end" />
            ),
            cell: ({ row }) => {
                const total = row.getValue("totalAmount") as number
                return (
                    <div className="text-end font-medium tabular-nums">
                        {total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <ExpenseActionsCell row={row.original} t={t} actions={actions} />
            ),
        },
    ]
}
