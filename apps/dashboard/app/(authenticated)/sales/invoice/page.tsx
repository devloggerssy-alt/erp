"use client"

import { useRouter } from "next/navigation"
import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { InvoiceForm } from "@/modules/invoices/invoice-form"
import { INVOICE_ROUTES } from "@devloggers/api-client"
import type { InvoicesClient } from "@devloggers/api-client"

type InvoiceItem = {
    id: number
    subject?: string
    invoice_number?: string
    customer_name?: string
    status?: string
    invoice_date?: string
    due_date?: string
    created_at?: string
}

export default function InvoicesPage() {
    const router = useRouter()

    return (
        <ResourcePage<InvoicesClient>
            pageTitle="Invoices"
            routeKey={INVOICE_ROUTES.INDEX}
            getClient={(api) => api.invoices}
            onRowClick={(row) => router.push(`/sales/invoice/${(row as any).id}`)}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Invoice">
                        {(resourceId) => (
                            <InvoiceForm
                                resourceId={resourceId}
                                initialData={selectedItem}
                                onSuccess={invalidateQuery}
                            />
                        )}
                    </FormDialog>
                ),
            })}
            columns={({ actionsColumn }) => [
                {
                    accessorKey: "subject",
                    header: ({ column }) => <ColumnHeader column={column} title="Subject" />,
                },
                {
                    accessorKey: "invoice_number",
                    header: ({ column }) => <ColumnHeader column={column} title="Invoice #" />,
                },
                {
                    accessorKey: "customer_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Customer" />,
                },
                {
                    accessorKey: "status",
                    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as InvoiceItem
                        const status = item.status
                        const colorMap: Record<string, string> = {
                            draft: "text-muted-foreground",
                            open: "text-blue-600",
                            paid: "text-green-600",
                            overdue: "text-red-600",
                            void: "text-gray-400",
                        }
                        return (
                            <span className={colorMap[status ?? ""] ?? ""}>
                                {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
                            </span>
                        )
                    },
                },
                {
                    accessorKey: "invoice_date",
                    header: ({ column }) => <ColumnHeader column={column} title="Invoice Date" />,
                },
                {
                    accessorKey: "due_date",
                    header: ({ column }) => <ColumnHeader column={column} title="Due Date" />,
                },
                actionsColumn(),
            ]}
        />
    )
}
