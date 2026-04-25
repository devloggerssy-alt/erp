"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { HolidayYearForm } from "@/modules/settings/holiday-year/holiday-year-form"
import { HOLIDAY_YEAR_ROUTES } from "@devloggers/api-client"
import type { HolidayYearsClient } from "@devloggers/api-client"

export default function HolidayYearsPage() {
    return (
        <ResourcePage<HolidayYearsClient>
            pageTitle="Holiday Years"
            routeKey={HOLIDAY_YEAR_ROUTES.INDEX}
            getClient={(api) => api.holidayYears}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Holiday Year">
                        {(resourceId) => (
                            <HolidayYearForm
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
                    accessorKey: "year",
                    header: ({ column }) => <ColumnHeader column={column} title="Year" />,
                },
                {
                    accessorKey: "created_at",
                    header: ({ column }) => <ColumnHeader column={column} title="Created At" />,
                    cell: ({ row }) => {
                        const date = (row.original as any).created_at
                        return date ? new Date(date).toLocaleDateString() : "—"
                    },
                },
                actionsColumn({ onEdit: undefined }),
            ]}
        />
    )
}
