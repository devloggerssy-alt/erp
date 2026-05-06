# Page Reference

## File Location

`apps/dashboard/app/(authenticated)/<section>/<feature>/page.tsx`

Where `<section>` is the navigation section (e.g. `sales`, `inventory`, `hr`) and `<feature>` is the resource in kebab-case plural.

## Complete Template (ResourcePage Pattern)

```tsx
"use client"

import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import { <Feature>Form } from '@/modules/<feature>/<feature>-form'
import { <RESOURCE>_ROUTES } from '@garage/api'
import type { <Resource>Client } from '@garage/api'

export default function <Features>Page() {
    return (
        <ResourcePage<<Resource>Client>
            pageTitle="<Features>"
            title="<Feature>"
            routeKey={<RESOURCE>_ROUTES.INDEX}
            getClient={(api) => api.<camelResource>}
            columns={({ actionsColumn }) => [
                {
                    accessorKey: "<primary_field>",
                    header: ({ column }) => <ColumnHeader column={column} title="<Primary Field>" />,
                },
                {
                    accessorKey: "<field_2>",
                    header: ({ column }) => <ColumnHeader column={column} title="<Field 2>" />,
                },
                // Add more columns as needed...
                actionsColumn(),
            ]}
            renderForm={({ resourceId, initialData, onSuccess }) => (
                <<Feature>Form
                    resourceId={resourceId}
                    initialData={initialData}
                    onSuccess={onSuccess}
                />
            )}
        />
    )
}
```

## ResourcePage Props

| Prop | Required | Description |
|---|---|---|
| `pageTitle` | No | Page heading text (e.g. "Customers") |
| `title` | Yes | Singular noun for button/dialog (e.g. "Customer" → "Add Customer") |
| `routeKey` | Yes | React Query cache key, use `ROUTES.INDEX` |
| `getClient` | Yes | Selects the domain client from the authenticated API |
| `columns` | Yes | Column definitions — use callback form to get `actionsColumn` helper |
| `renderForm` | Yes | Renders the form component inside the dialog |
| `queryOptions` | No | React Query overrides (`staleTime`, etc.) |

## Column Patterns

### Simple text column (sortable)
```tsx
{
    accessorKey: "name",
    header: ({ column }) => <ColumnHeader column={column} title="Name" />,
},
```

### Custom cell renderer
```tsx
{
    accessorKey: "status",
    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
        <span className={row.original.status === "active" ? "text-green-600" : "text-red-600"}>
            {row.original.status}
        </span>
    ),
},
```

### Column with icon
```tsx
{
    accessorKey: "name",
    header: ({ column }) => <ColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <UserIcon className="text-muted-foreground" />
            <span>{row.original.name}</span>
        </div>
    ),
},
```

### Non-sortable column
```tsx
{
    accessorKey: "notes",
    header: () => <span>Notes</span>,
    enableSorting: false,
},
```

### Actions column (always last)
```tsx
actionsColumn(),
```

## Real Example: Customers Page

```tsx
"use client"

import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import { CustomerForm } from '@/modules/customers/customer-form'
import { CUSTOMER_ROUTES } from '@garage/api'
import type { CustomersClient } from '@garage/api'
import { Building2Icon, UserIcon } from 'lucide-react'

export default function CustomersPage() {
    return (
        <ResourcePage<CustomersClient>
            pageTitle='Customers'
            title="Customer"
            routeKey={CUSTOMER_ROUTES.INDEX}
            getClient={(api) => api.customers}
            columns={({ actionsColumn }) => [
                {
                    accessorKey: "first_name",
                    header: ({ column }) => <ColumnHeader column={column} title="Customer" />,
                    cell: ({ row }) => {
                        const customerName = row.original.first_name
                        const isCompany = row.original.customer_type?.name?.toLocaleLowerCase() === "company";
                        const companyName = row.original.company_name
                        const name = isCompany && companyName
                            ? `${customerName} (${row.original.last_name})`
                            : customerName
                        return (
                            <div className="flex items-center gap-2">
                                {isCompany
                                    ? <Building2Icon className="text-muted-foreground" />
                                    : <UserIcon className="text-muted-foreground" />}
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
            renderForm={({ resourceId, initialData, onSuccess }) => (
                <CustomerForm
                    resourceId={resourceId}
                    initialData={initialData}
                    onSuccess={onSuccess}
                />
            )}
        />
    )
}
```

## Alternative: Manual DataTable Pattern (Read-Only or Custom Layout)

Use only when you don't need create/edit/delete in a dialog:

```tsx
"use client"

import { DashboardHeader } from '@/base/components/layout/dashboard'
import DashboardPage from '@/base/components/layout/dashboard/dashboard-page'
import { ColumnHeader, DataTable, useDataTableQuery } from '@/shared/data-view/table-view'
import { useAuthApi } from '@/shared/useApi'
import { <RESOURCE>_ROUTES } from '@garage/api'
import type { ColumnDef } from '@tanstack/react-table'

const columns: ColumnDef<any>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => <ColumnHeader column={column} title="Name" />,
    },
    // ... more columns
]

export default function <Features>Page() {
    const api = useAuthApi()

    const { data, isLoading, pagination, sorting, handleChange } = useDataTableQuery({
        queryKey: [<RESOURCE>_ROUTES.INDEX],
        client: api.<camelResource>,
    })

    const response = data as any

    return (
        <DashboardPage header={<DashboardHeader />}>
            <DataTable
                columns={columns}
                data={response?.data ?? []}
                pagination={{
                    ...pagination,
                    pageCount: response?.meta?.last_page ?? 1,
                    total: response?.meta?.total ?? 0,
                }}
                sorting={sorting}
                onChange={handleChange}
                isLoading={isLoading}
            />
        </DashboardPage>
    )
}
```
