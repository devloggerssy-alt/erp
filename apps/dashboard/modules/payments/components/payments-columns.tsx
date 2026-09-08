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
    postPayment: (id: string) => Promise<unknown>
    cancelPayment: (id: string) => Promise<unknown>
}

// NOTE ON THE CASTS BELOW (kept intentionally — do not remove without fixing the root cause):
// `ResourceItem<PaymentsClient>` resolves to `BaseCrudItem` (just `{ id: string }`), not the real
// `PaymentResponseDto` shape, because `PaymentsClient` hand-implements `ICrudClient` instead of
// extending `CrudClient<typeof paymentResource>` (see packages/api-client/src/clients/payments.client.ts).
// It does this because `paymentResource` (packages/api-contracts/src/resources/payment.resource.ts)
// is defined with `defineResource` and uses non-standard route names (`details` instead of `show`,
// no `delete` route), so it doesn't satisfy the `CrudResource` shape `CrudClient<R>` requires.
// Fixing this properly means changing `paymentResource`'s route names and `PaymentsClient`'s base
// class — both outside apps/dashboard and out of scope for this task. Verified via the generated
// OpenAPI types that the real `PaymentResponseDto` is FLAT (`cashboxCode`, `cashboxName`, `partyName`
// — no nested `cashbox`/`party` objects), so the field access below has been corrected to match,
// even though the compile-time type still forces a cast.
type PaymentRow = {
    id: string
    number: string
    type: string
    date: string
    status: string
    cashboxCode?: string
    partyName?: string
    amount: number
}

function asRow(item: PaymentItem): PaymentRow {
    // See NOTE above: PaymentsClient hand-implements ICrudClient instead of extending
    // CrudClient<typeof paymentResource>, so ResourceItem<PaymentsClient> erases to
    // BaseCrudItem ({ id: string }) rather than the real PaymentResponseDto shape.
    // eslint-disable-next-line no-restricted-syntax -- see comment above: ResourceItem<PaymentsClient> erases to BaseCrudItem
    return item as unknown as PaymentRow
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
    const status = asRow(row).status
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
            id: "number",
            accessorFn: (row) => asRow(row).number,
            header: ({ column }) => <ColumnHeader column={column} title={t("number")} />,
            cell: ({ row }) => (
                <span className="font-mono font-semibold text-sm">{asRow(row.original).number}</span>
            ),
        },
        {
            id: "type",
            accessorFn: (row) => asRow(row).type,
            header: ({ column }) => <ColumnHeader column={column} title={t("type")} />,
            cell: ({ row }) => {
                const type = asRow(row.original).type
                return (
                    <Badge variant="secondary" className="text-xs font-medium">
                        {type === "RECEIPT" ? t("types.RECEIPT") : type === "PAYMENT" ? t("types.PAYMENT") : t("types.ADJUSTMENT")}
                    </Badge>
                )
            },
        },
        {
            id: "date",
            accessorFn: (row) => asRow(row).date,
            header: ({ column }) => <ColumnHeader column={column} title={t("date")} />,
            cell: ({ row }) => {
                const val = asRow(row.original).date
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
        {
            id: "cashboxCode",
            header: ({ column }) => <ColumnHeader column={column} title={t("cashbox")} />,
            cell: ({ row }) => {
                const code = asRow(row.original).cashboxCode
                return code
                    ? <span className="font-mono text-sm">{code}</span>
                    : <span className="text-muted-foreground">—</span>
            },
        },
        {
            id: "partyName",
            header: ({ column }) => <ColumnHeader column={column} title={t("party")} />,
            cell: ({ row }) => {
                const name = asRow(row.original).partyName
                return name
                    ? <span>{name}</span>
                    : <span className="text-muted-foreground">—</span>
            },
        },
        {
            id: "status",
            accessorFn: (row) => asRow(row).status,
            header: ({ column }) => <ColumnHeader column={column} title={t("statusLabel")} />,
            cell: ({ row }) => {
                const status = asRow(row.original).status
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
            id: "amount",
            accessorFn: (row) => asRow(row).amount,
            header: ({ column }) => (
                <ColumnHeader column={column} title={t("amount")} className="text-end" />
            ),
            cell: ({ row }) => {
                const amount = asRow(row.original).amount
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
