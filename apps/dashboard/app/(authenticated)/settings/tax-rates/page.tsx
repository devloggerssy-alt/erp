"use client"

import { TaxForm } from "@/modules/settings/tax-rates/tax-form"
import { ResourcePage } from "@/shared/data-view/resource-page"
import { ColumnHeader } from "@/shared/data-view/table-view"
import FormDialog from "@/shared/components/form-dialog"
import { TAX_ROUTES } from "@devloggers/api-client"
import type { TaxesClient } from "@devloggers/api-client"
import { CheckIcon, XIcon } from "lucide-react"

export default function TaxesPage() {
    return (
        <ResourcePage<TaxesClient>
            pageTitle="Tax & Rates"
            routeKey={TAX_ROUTES.INDEX}
            getClient={(api) => api.taxes}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Tax">
                        {(resourceId) => (
                            <TaxForm
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
                    accessorKey: "rate",
                    header: ({ column }) => <ColumnHeader column={column} title="Rate (%)" />,
                    cell: ({ row }) => `${(row.original as any).rate ?? 0}%`,
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
