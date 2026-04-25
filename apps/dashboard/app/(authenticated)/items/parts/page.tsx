"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { PartForm } from "@/modules/parts/part-form"
import { Badge } from "@/shared/components/ui/badge"
import { PARTS_ROUTES } from "@devloggers/api-client"
import type { PartsClient } from "@devloggers/api-client"

export default function PartsPage() {
    return (
        <ResourcePage<PartsClient>
            pageTitle="Parts"
            routeKey={PARTS_ROUTES.INDEX}
            getClient={(api) => api.parts}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Part">
                        {(resourceId) => (
                            <PartForm
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
                    cell: ({ row }) => {
                        const r = row.original as any
                        return (
                            <div>
                                <span className="font-medium">{r.title || "—"}</span>
                                {r.sku && (
                                    <span className="ml-2 text-xs text-muted-foreground">{r.sku}</span>
                                )}
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "part_number",
                    header: ({ column }) => <ColumnHeader column={column} title="Part #" />,
                    cell: ({ row }) => (row.original as any).part_number || "—",
                },
                {
                    accessorKey: "manufactured_by",
                    header: ({ column }) => <ColumnHeader column={column} title="Manufacturer" />,
                    cell: ({ row }) => (row.original as any).manufactured_by || "—",
                },
                {
                    accessorKey: "selling_price",
                    header: ({ column }) => <ColumnHeader column={column} title="Sell Price" />,
                    cell: ({ row }) => {
                        const val = (row.original as any).selling_price
                        return val != null ? `$${Number(val).toFixed(2)}` : "—"
                    },
                },
                {
                    accessorKey: "purchase_price",
                    header: ({ column }) => <ColumnHeader column={column} title="Cost" />,
                    cell: ({ row }) => {
                        const val = (row.original as any).purchase_price
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
