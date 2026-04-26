"use client"

import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import FormDialog from '@/shared/components/form-dialog'
import { EstimateForm } from '@/modules/estimates/estimate-form'
import { ESTIMATE_ROUTES } from '@devloggers/api'
import type { EstimatesClient } from '@devloggers/api'
import { FileTextIcon } from 'lucide-react'

type EstimateItem = {
    id: number
    title?: string
    estimate_number?: string
    date?: string
    customer_name?: string
    vehicle_name?: string
    has_insurance?: boolean
    created_at?: string
}

export default function EstimatesPage({ vehicleId }: { vehicleId: string }) {
    return (
        <ResourcePage<EstimatesClient>
            pageTitle="Estimates"
            routeKey={ESTIMATE_ROUTES.INDEX}
            getClient={(api) => api.estimates}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Estimate">
                        {(resourceId) => (
                            <EstimateForm
                                resourceId={resourceId}
                                initialData={{ vehicle: { label: vehicleId, value: vehicleId } }}
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
                        const item = row.original as unknown as EstimateItem
                        return (
                            <div className="flex items-center gap-2">
                                <FileTextIcon className="text-muted-foreground h-4 w-4" />
                                <span>{item.title}</span>
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "estimate_number",
                    header: ({ column }) => <ColumnHeader column={column} title="Estimate #" />,
                },
                {
                    accessorKey: "customer_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Customer" />,
                },
                {
                    accessorKey: "vehicle_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Vehicle" />,
                },
                {
                    accessorKey: "date",
                    header: ({ column }) => <ColumnHeader column={column} title="Date" />,
                },
                {
                    accessorKey: "has_insurance",
                    header: ({ column }) => <ColumnHeader column={column} title="Insurance" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as EstimateItem
                        return item.has_insurance ? "Yes" : "No"
                    },
                },
                {
                    accessorKey: "created_at",
                    header: ({ column }) => <ColumnHeader column={column} title="Created" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as EstimateItem
                        return item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"
                    },
                },
                actionsColumn(),
            ]}
        />
    )
}