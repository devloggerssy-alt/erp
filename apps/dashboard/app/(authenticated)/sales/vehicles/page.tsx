"use client"

import { useRouter } from 'next/navigation'
import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import FormDialog from '@/shared/components/form-dialog'
import { VehicleForm } from '@/modules/vehicles/vehicle-form'
import { VEHICLE_ROUTES } from '@devloggers/api'
import type { VehiclesClient } from '@devloggers/api'
import { CarIcon } from 'lucide-react'

export default function VehiclesPage() {
    const router = useRouter()
    return (
        <ResourcePage<VehiclesClient>
            pageTitle="Vehicles"
            routeKey={VEHICLE_ROUTES.INDEX}
            getClient={(api) => api.vehicles}
            onRowClick={(row) => router.push(`/sales/vehicles/${(row as any).id}`)}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Vehicle">
                        {(resourceId) => (
                            <VehicleForm
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
                    header: ({ column }) => <ColumnHeader column={column} title="Vehicle" />,
                    cell: ({ row }) => {
                        const r = row.original as any
                        const make = r.make ?? ""
                        const model = r.model ?? ""
                        const display = r.name || `${make} ${model}`.trim() || "—"
                        return (
                            <div className="flex items-center gap-2">
                                <CarIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <span className="font-medium">{display}</span>
                                    {r.sub_model && (
                                        <span className="ml-1 text-xs text-muted-foreground">{r.sub_model}</span>
                                    )}
                                </div>
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "year",
                    header: ({ column }) => <ColumnHeader column={column} title="Year" />,
                    cell: ({ row }) => (row.original as any).year ?? "—",
                },
                {
                    accessorKey: "license_plate",
                    header: ({ column }) => <ColumnHeader column={column} title="License Plate" />,
                    cell: ({ row }) => {
                        const val = (row.original as any).license_plate
                        return val
                            ? <span className="font-mono text-xs">{val}</span>
                            : "—"
                    },
                },
                {
                    accessorKey: "vin_number",
                    header: ({ column }) => <ColumnHeader column={column} title="VIN" />,
                    cell: ({ row }) => {
                        const val = (row.original as any).vin_number
                        return val
                            ? <span className="max-w-30 truncate block font-mono text-xs">{val}</span>
                            : "—"
                    },
                },
                {
                    accessorKey: "engine_size",
                    header: ({ column }) => <ColumnHeader column={column} title="Engine" />,
                    cell: ({ row }) => (row.original as any).engine_size ?? "—",
                },
                {
                    accessorKey: "mileage",
                    header: ({ column }) => <ColumnHeader column={column} title="Mileage" />,
                    cell: ({ row }) => {
                        const val = (row.original as any).mileage
                        return val != null ? `${Number(val).toLocaleString()} mi` : "—"
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