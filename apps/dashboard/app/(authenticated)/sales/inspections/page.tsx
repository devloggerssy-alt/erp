"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { InspectionForm } from "@/modules/inspections/inspection-form"
import { INSPECTION_ROUTES } from "@devloggers/api-client"
import type { InspectionsClient } from "@devloggers/api-client"

export default function InspectionsPage() {
    return (
        <ResourcePage<InspectionsClient>
            pageTitle="Inspections"
            routeKey={INSPECTION_ROUTES.INDEX}
            getClient={(api) => api.inspections}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Inspection">
                        {(resourceId) => (
                            <InspectionForm
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
                    accessorKey: "customer",
                    header: ({ column }) => <ColumnHeader column={column} title="Customer" />,
                    cell: ({ row }) => {
                        const c = (row.original as any).customer
                        return c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() : "—"
                    },
                },
                {
                    accessorKey: "vehicle",
                    header: ({ column }) => <ColumnHeader column={column} title="Vehicle" />,
                    cell: ({ row }) => {
                        const v = (row.original as any).vehicle
                        return v ? `${v.make ?? ""} ${v.model ?? ""}`.trim() : "—"
                    },
                },
                {
                    accessorKey: "inspection_category",
                    header: ({ column }) => <ColumnHeader column={column} title="Category" />,
                    cell: ({ row }) => (row.original as any).inspection_category?.name ?? "—",
                },
                {
                    accessorKey: "status",
                    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
                    cell: ({ row }) => {
                        const status = (row.original as any).status
                        return (
                            <span className={status === "completed" ? "text-green-600" : "text-yellow-600"}>
                                {status ?? "—"}
                            </span>
                        )
                    },
                },
                actionsColumn(),
            ]}
        />
    )
}
