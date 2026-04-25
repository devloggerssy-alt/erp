"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { ShopCalendarForm } from "@/modules/shop-calendars/shop-calendar-form"
import { SHOP_CALENDAR_ROUTES } from "@devloggers/api-client"
import type { ShopCalendarsClient } from "@devloggers/api-client"
import { CheckCircle2Icon } from "lucide-react"

export default function ShopCalendarsPage() {
    return (
        <ResourcePage<ShopCalendarsClient>
            pageTitle="Shop Calendars"
            routeKey={SHOP_CALENDAR_ROUTES.INDEX}
            getClient={(api) => api.shopCalendars}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Shop Calendar">
                        {(resourceId) => (
                            <ShopCalendarForm
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
                    accessorKey: "is_default",
                    header: ({ column }) => <ColumnHeader column={column} title="Default" />,
                    cell: ({ row }) =>
                        (row.original as any).is_default ? (
                            <CheckCircle2Icon className="text-green-600 h-5 w-5" />
                        ) : null,
                },
                {
                    accessorKey: "shop_calender_days",
                    header: () => <span>Days</span>,
                    enableSorting: false,
                    cell: ({ row }) => {
                        const days = (row.original as any).shop_calender_days
                        return days?.length ?? 0
                    },
                },
                actionsColumn({ onEdit: undefined }),
            ]}
        />
    )
}
