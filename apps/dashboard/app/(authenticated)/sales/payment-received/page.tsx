"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { PaymentReceivedForm } from "@/modules/payment-received/payment-received-form"
import { PAYMENT_ROUTES } from "@devloggers/api-client"
import {
    BadgeDollarSignIcon,
    CalendarIcon,
    CreditCardIcon,
    HashIcon,
    UserIcon,
    ClipboardListIcon,
} from "lucide-react"

type PaymentReceivedItem = {
    id: number
    payment_number?: string
    customer_name?: string
    job_card_name?: string
    job_card_number?: string
    payment_mode_name?: string
    amount_received?: string | number
    payment_date?: string
    note?: string
    status?: string
    created_at?: string
}

export default function PaymentReceivedPage() {
    return (
        <ResourcePage<{ list(query?: any): Promise<any>; destroy(id: string): Promise<any> }>
            pageTitle="Payments Received"
            routeKey={PAYMENT_ROUTES.RECEIVED}
            getClient={(api) => ({
                list: (query?: any) => api.payments.listReceived(query),
                destroy: (id: string) => api.payments.destroyReceived(id),
            })}
            headerProps={({ invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Record Payment">
                        {(resourceId) => (
                            <PaymentReceivedForm
                                resourceId={resourceId}
                                onSuccess={invalidateQuery}
                            />
                        )}
                    </FormDialog>
                ),
            })}
            columns={({ actionsColumn }) => [
                {
                    accessorKey: "payment_number",
                    header: ({ column }) => <ColumnHeader column={column} title="Payment #" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as PaymentReceivedItem
                        return (
                            <div className="flex items-center gap-2">
                                <HashIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{item.payment_number || "—"}</span>
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "customer_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Customer" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as PaymentReceivedItem
                        return (
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                                <span>{item.customer_name || "—"}</span>
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "job_card_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Job Card" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as PaymentReceivedItem
                        const label = item.job_card_number || item.job_card_name
                        return (
                            <div className="flex items-center gap-2">
                                <ClipboardListIcon className="h-4 w-4 text-muted-foreground" />
                                <span>{label || "—"}</span>
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "amount_received",
                    header: ({ column }) => <ColumnHeader column={column} title="Amount" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as PaymentReceivedItem
                        const amount = item.amount_received
                            ? Number(item.amount_received).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })
                            : "—"
                        return (
                            <div className="flex items-center gap-2">
                                <BadgeDollarSignIcon className="h-4 w-4 text-emerald-600" />
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    {amount}
                                </span>
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "payment_mode_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Payment Mode" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as PaymentReceivedItem
                        return (
                            <div className="flex items-center gap-2">
                                <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="capitalize">{item.payment_mode_name || "—"}</span>
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "payment_date",
                    header: ({ column }) => <ColumnHeader column={column} title="Date" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as PaymentReceivedItem
                        const formatted = item.payment_date
                            ? new Date(item.payment_date).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            })
                            : "—"
                        return (
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                <span>{formatted}</span>
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "note",
                    header: () => <span>Note</span>,
                    enableSorting: false,
                    cell: ({ row }) => {
                        const item = row.original as unknown as PaymentReceivedItem
                        const note = item.note
                        if (!note) return <span className="text-muted-foreground">—</span>
                        return (
                            <span className="max-w-50 truncate block" title={note}>
                                {note}
                            </span>
                        )
                    },
                },
                actionsColumn(),
            ]}
        />
    )
}
