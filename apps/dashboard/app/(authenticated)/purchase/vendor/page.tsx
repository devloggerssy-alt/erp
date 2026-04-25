"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { VendorForm } from "@/modules/vendors/vendor-form"
import { VENDOR_ROUTES } from "@devloggers/api-client"
import type { VendorsClient } from "@devloggers/api-client"

export default function VendorsPage() {
    return (
        <ResourcePage<VendorsClient>
            pageTitle="Vendors"
            routeKey={VENDOR_ROUTES.INDEX}
            getClient={(api) => api.vendors}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Vendor">
                        {(resourceId) => (
                            <VendorForm
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
                    accessorKey: "first_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Name" />,
                    cell: ({ row }) => {
                        const r = row.original as any
                        const name = [r.first_name, r.last_name].filter(Boolean).join(" ")
                        return name || "—"
                    },
                },
                {
                    accessorKey: "company_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Company" />,
                    cell: ({ row }) => (row.original as any).company_name || "—",
                },
                {
                    accessorKey: "email",
                    header: ({ column }) => <ColumnHeader column={column} title="Email" />,
                    cell: ({ row }) => (row.original as any).email || "—",
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
