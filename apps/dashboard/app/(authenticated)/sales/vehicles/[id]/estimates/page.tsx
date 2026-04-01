
"use client"

import { use } from "react"
import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import FormDialog from '@/shared/components/form-dialog'
import { EstimateForm } from '@/modules/estimates/estimate-form'
import { ESTIMATE_ROUTES } from '@garage/api'
import type { EstimatesClient } from '@garage/api'
import { FileTextIcon } from 'lucide-react'
import { useVehicle } from '@/modules/vehicles/vehicle-context'

type EstimateItem = {
    id: number
    title?: string
    estimate_number?: string
    date?: string
    customer_name?: string
    has_insurance?: boolean
    created_at?: string
}

export default function VehicleEstimatesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: vehicleId } = use(params)
    const vehicle = useVehicle()

    return (
        <>
        <ResourcePage<EstimatesClient>
            toolbar={({ invalidateQuery, selectedItem, closeDialog }) => (
                <FormDialog title="Estimate">
                    {(resourceId) => (
                        <EstimateForm
                            resourceId={resourceId}
                            initialData={{
                                vehicle: vehicle ? { value: vehicle.id, label: vehicle.label } : null,
                            }}
                            onSuccess={() => {
                                closeDialog();
                                invalidateQuery();
                            }}
                        />
                    )}
                </FormDialog>
            )
            }
            pageTitle="Vehicle Estimates"
            routeKey={ESTIMATE_ROUTES.INDEX}
            getClient={(api) => api.estimates}
            extraParams={{ vehicle_id: vehicleId }}
            header={
                null
            }
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
        </>
    )
}
