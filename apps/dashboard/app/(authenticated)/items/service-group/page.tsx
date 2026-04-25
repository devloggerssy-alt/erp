"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { ServiceGroupForm } from "@/modules/service-groups/service-group-form"
import { Badge } from "@/shared/components/ui/badge"
import { SERVICE_GROUP_ROUTES } from "@devloggers/api-client"
import type { ServiceGroupsClient } from "@devloggers/api-client"

export default function ServiceGroupPage() {
    return (
        <ResourcePage<ServiceGroupsClient>
            pageTitle="Service Groups"
            routeKey={SERVICE_GROUP_ROUTES.INDEX}
            getClient={(api) => api.serviceGroups}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Service Group">
                        {(resourceId) => (
                            <ServiceGroupForm
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
                    accessorKey: "name",
                    header: ({ column }) => <ColumnHeader column={column} title="Name" />,
                    cell: ({ row }) => {
                        const r = row.original as any
                        return (
                            <div>
                                <span className="font-medium">{r.service_name || r.name || "—"}</span>
                                {r.code && (
                                    <span className="ml-2 text-xs text-muted-foreground">{r.code}</span>
                                )}
                            </div>
                        )
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
                    accessorKey: "is_active",
                    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
                    cell: ({ row }) => {
                        const active = (row.original as any).is_active
                        return (
                            <Badge variant={active ? "default" : "secondary"}>
                                {active ? "Active" : "Inactive"}
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
