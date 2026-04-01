"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { EmployeeForm } from "@/modules/employees/employee-form"
import { EMPLOYEE_ROUTES } from "@garage/api"
import type { EmployeesClient } from "@garage/api"

export default function EmployeesPage() {
    return (
        <ResourcePage<EmployeesClient>
            pageTitle="Employees"
            routeKey={EMPLOYEE_ROUTES.INDEX}
            getClient={(api) => api.employees}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Employee">
                        {(resourceId) => (
                            <EmployeeForm
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
                    accessorKey: "first_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Name" />,
                    cell: ({ row }) => {
                        const { first_name, last_name } = row.original
                        return `${first_name ?? ""} ${last_name ?? ""}`.trim()
                    },
                },
                {
                    accessorKey: "email",
                    header: ({ column }) => <ColumnHeader column={column} title="Email" />,
                },
                {
                    accessorKey: "phone",
                    header: ({ column }) => <ColumnHeader column={column} title="Phone" />,
                },
                {
                    accessorKey: "position",
                    header: ({ column }) => <ColumnHeader column={column} title="Position" />,
                },
                {
                    accessorKey: "department",
                    header: ({ column }) => <ColumnHeader column={column} title="Department" />,
                    cell: ({ row }) => (row.original as any).department?.name ?? "—",
                },
                {
                    accessorKey: "status",
                    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
                    cell: ({ row }) => {
                        const status = row.original.status
                        return (
                            <span className={status === "active" ? "text-green-600" : "text-red-600"}>
                                {status}
                            </span>
                        )
                    },
                },
                actionsColumn(),
            ]}
        />
    )
}
