"use client"

import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { ShopTypeForm } from "@/modules/settings/shop-type/shop-type-form"
import { SHOP_TYPE_ROUTES } from "@devloggers/api-client"
import type { ShopTypesClient } from "@devloggers/api-client"
import { CheckIcon, XIcon } from "lucide-react"

export default function ShopTypesPage() {
    return (
        <ResourcePage<ShopTypesClient>
            pageTitle="Shop Types"
            routeKey={SHOP_TYPE_ROUTES.INDEX}
            getClient={(api) => api.shopTypes}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Shop Type">
                        {(resourceId) => (
                            <ShopTypeForm
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
                    accessorKey: "shop_type",
                    header: ({ column }) => <ColumnHeader column={column} title="Type" />,
                },
                {
                    accessorKey: "note",
                    header: ({ column }) => <ColumnHeader column={column} title="Note" />,
                    cell: ({ row }) => (
                        <span className="text-muted-foreground line-clamp-1">
                            {(row.original as any).note ?? "—"}
                        </span>
                    ),
                },
                {
                    accessorKey: "is_default",
                    header: ({ column }) => <ColumnHeader column={column} title="Default" />,
                    cell: ({ row }) =>
                        (row.original as any).is_default
                            ? <CheckIcon className="h-4 w-4 text-green-600" />
                            : <XIcon className="h-4 w-4 text-muted-foreground" />,
                },
                actionsColumn(),
            ]}
        />
    )
}
