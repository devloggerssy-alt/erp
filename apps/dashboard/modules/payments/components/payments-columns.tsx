"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { PaymentsClient } from "@devloggers/api-client"
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

type PaymentItem = ResourceItem<PaymentsClient>
type ColumnTranslator = (key: string) => string

export type PaymentColumnActions = {
    onOpenModal: (id: string) => void
    postPayment: (id: string) => Promise<void>
    cancelPayment: (id: string) => Promise<void>
}

function PaymentActionsCell({
    row,
    t,
    actions,
}: {
    row: PaymentItem
    t: ColumnTranslator
    actions: PaymentColumnActions
}) {
    const status = (row as Record<string, unknown>)["status"] as string
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
                        <DropdownMenuItem onClick={() => actions.postPayment(id)}>
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
                            onClick={() => actions.cancelPayment(id)}
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

export function createPaymentsColumns(
    _helpers: ResourceTableHelpers<PaymentsClient>,
    t: ColumnTranslator,
    actions: PaymentColumnActions,
): ColumnDef<PaymentItem>[] {
    return [
        {
            accessorKey: "number",
            header: ({ column }) => <ColumnHeader column={column} title={t("number")} />,
            cell: ({ row }) => (
                <span className="font-mono font-semibold text-sm">{row.getValue("number")}</span>
            ),
        },
        {
            accessorKey: "type",
            header: ({ column }) => <ColumnHeader column={column} title={t("type")} />,
            cell: ({ row }) => {
                const type = row.getValue("type") as string
                return (
                    <Badge variant="secondary" className="text-xs font-medium">
                        {type === "RECEIPT" ? t("types.RECEIPT") : type === "PAYMENT" ? t("types.PAYMENT") : t("types.ADJUSTMENT")}
                    </Badge>
                )
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
            id: "cashboxCode",
            header: ({ column }) => <ColumnHeader column={column} title={t("cashbox")} />,
            cell: ({ row }) => {
                const cashbox = (row.original as Record<string, unknown>)["cashbox"] as Record<string, string> | undefined
                return cashbox?.["code"]
                    ? <span className="font-mono text-sm">{cashbox["code"]}</span>
                    : <span className="text-muted-foreground">—</span>
            },
        },
        {
            id: "partyName",
            header: ({ column }) => <ColumnHeader column={column} title={t("party")} />,
            cell: ({ row }) => {
                const party = (row.original as Record<string, unknown>)["party"] as Record<string, string> | undefined
                return party?.["name"]
                    ? <span>{party["name"]}</span>
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
            accessorKey: "amount",
            header: ({ column }) => (
                <ColumnHeader column={column} title={t("amount")} className="text-end" />
            ),
            cell: ({ row }) => {
                const amount = row.getValue("amount") as number
                return (
                    <div className="text-end font-medium tabular-nums">
                        {amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <PaymentActionsCell row={row.original} t={t} actions={actions} />
            ),
        },
    ]
}
