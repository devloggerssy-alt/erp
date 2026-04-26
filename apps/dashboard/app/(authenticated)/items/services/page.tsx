"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { ServiceForm } from "@/modules/services/service-form"
import { SERVICE_ROUTES } from "@garage/api"
import type { ServicesClient } from "@garage/api"

export default function ServicesPage() {
    return (
        <ResourcePage<ServicesClient>
            pageTitle="Services"
            routeKey={SERVICE_ROUTES.INDEX}
            getClient={(api) => api.services}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Service">
                        {(resourceId) => (
                            <ServiceForm
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
                    accessorKey: "labor_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Name" />,
                    cell: ({ row }) => {
                        const r = row.original as any
                        return (
                            <div>
                                <span className="font-medium">{r.labor_name || r.name || "—"}</span>
                                {r.service_code && (
                                    <span className="ml-2 text-xs text-muted-foreground">{r.service_code}</span>
                                )}
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "description",
                    header: ({ column }) => <ColumnHeader column={column} title="Description" />,
                    cell: ({ row }) => {
                        const val = (row.original as any).description
                        return val
                            ? <span className="max-w-[200px] truncate block">{val}</span>
                            : "—"
                    },
                },
                {
                    accessorKey: "selling_price",
                    header: ({ column }) => <ColumnHeader column={column} title="Price" />,
                    cell: ({ row }) => {
                        const val = (row.original as any).selling_price
                        return val != null ? `$${Number(val).toFixed(2)}` : "—"
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
