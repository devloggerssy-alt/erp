import type { ColumnDef } from "@tanstack/react-table"
import type { WarehousesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"

export function createWarehousesColumns(
    helpers: ResourceTableHelpers<WarehousesClient>,
): ColumnDef<ResourceItem<WarehousesClient>>[] {
    return [
        {
            accessorKey: "code",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title="Code" />,
        },
        {
            accessorKey: "name",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        },
        {
            accessorKey: "address",
            header: ({ column }) => <ColumnHeader column={column} title="Address" />,
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title="Active" />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        helpers.actionsColumn(),
    ]
}
