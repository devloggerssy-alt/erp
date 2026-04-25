"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { ShopTimingForm } from "@/modules/shop-timings/shop-timing-form"
import { SHOP_TIMING_ROUTES } from "@devloggers/api-client"
import type { ShopTimingsClient } from "@devloggers/api-client"
import { CheckCircle2Icon } from "lucide-react"

export default function ShopTimingsPage() {
    return (
        <ResourcePage<ShopTimingsClient>
            pageTitle="Shop Timings"
            routeKey={SHOP_TIMING_ROUTES.INDEX}
            getClient={(api) => api.shopTimings}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Shop Timing">
                        {(resourceId) => (
                            <ShopTimingForm
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
                    accessorKey: "in_time",
                    header: ({ column }) => <ColumnHeader column={column} title="In Time" />,
                },
                {
                    accessorKey: "out_time",
                    header: ({ column }) => <ColumnHeader column={column} title="Out Time" />,
                },
                {
                    accessorKey: "full_day_hours",
                    header: ({ column }) => <ColumnHeader column={column} title="Full Day Hours" />,
                },
                {
                    accessorKey: "half_day_hours",
                    header: ({ column }) => <ColumnHeader column={column} title="Half Day Hours" />,
                },
                {
                    accessorKey: "is_default",
                    header: ({ column }) => <ColumnHeader column={column} title="Default" />,
                    cell: ({ row }) =>
                        row.original.is_default ? (
                            <CheckCircle2Icon className="text-green-600 h-5 w-5" />
                        ) : null,
                },
                actionsColumn(),
            ]}
        />
    )
}
