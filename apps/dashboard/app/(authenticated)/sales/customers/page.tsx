"use client"

import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import FormDialog from '@/shared/components/form-dialog'
import { CustomerForm } from '@/modules/customers/customer-form'
import { CUSTOMER_ROUTES } from '@garage/api'
import type { CustomersClient } from '@garage/api'
import { Building2Icon,   UserIcon } from 'lucide-react'

export default function CustomersPage() {
    return (
        <ResourcePage<CustomersClient>
            pageTitle='Customers'
            routeKey={CUSTOMER_ROUTES.INDEX}
            getClient={(api) => api.customers}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Customer">
                        {(resourceId) => (
                            <CustomerForm
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
                    header: ({ column }) => <ColumnHeader column={column} title="Customer" />,
                    cell: ({ row }) => {
                        const customerName = row.original.first_name
                        const isCompany = row.original.customer_type?.name?.toLocaleLowerCase() === "company";
                        const companyName = row.original.company_name 
                        const name = isCompany && companyName ? `${customerName} (${row.original.last_name})` : customerName
                    
                    return (<div className="flex items-center gap-2">
                            {isCompany ? <Building2Icon className="text-muted-foreground" /> : <UserIcon className="text-muted-foreground" />}
                            <span>{name}</span>
                        </div>
                        )
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
                actionsColumn(),
            ]}
        />
    )
}