"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { ExpenseForm } from "@/modules/expenses/expense-form"
import { Badge } from "@/shared/components/ui/badge"
import { EXPENSE_ROUTES } from "@garage/api"
import type { ExpensesClient } from "@garage/api"

export default function ExpensesPage() {
    return (
        <ResourcePage<ExpensesClient>
            pageTitle="Expenses"
            routeKey={EXPENSE_ROUTES.INDEX}
            getClient={(api) => api.expenses}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Expense">
                        {(resourceId) => (
                            <ExpenseForm
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
                    accessorKey: "title",
                    header: ({ column }) => <ColumnHeader column={column} title="Title" />,
                },
                {
                    accessorKey: "invoice_number",
                    header: ({ column }) => <ColumnHeader column={column} title="Invoice #" />,
                    cell: ({ row }) => (row.original as any).invoice_number || "—",
                },
                {
                    accessorKey: "vendor_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Vendor" />,
                    cell: ({ row }) => (row.original as any).vendor_name || "—",
                },
                {
                    accessorKey: "expense_date",
                    header: ({ column }) => <ColumnHeader column={column} title="Date" />,
                    cell: ({ row }) => {
                        const val = (row.original as any).expense_date
                        return val ? new Date(val).toLocaleDateString() : "—"
                    },
                },
                {
                    accessorKey: "status",
                    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
                    cell: ({ row }) => {
                        const status = (row.original as any).status
                        return (
                            <Badge variant={status === "paid" ? "default" : "secondary"}>
                                {status || "—"}
                            </Badge>
                        )
                    },
                },
                {
                    accessorKey: "created_at",
                    header: ({ column }) => <ColumnHeader column={column} title="Created" />,
                    cell: ({ row }) => {
                        const val = (row.original as any).created_at
                        return val ? new Date(val).toLocaleDateString() : "—"
                    },
                },
                actionsColumn(),
            ]}
        />
    )
}
