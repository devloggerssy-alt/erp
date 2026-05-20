import type { ColumnDef } from "@tanstack/react-table"
import type { CategoriesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"

export function createCategoriesColumns(
    helpers: ResourceTableHelpers<CategoriesClient>,
): ColumnDef<ResourceItem<CategoriesClient>>[] {
    return [
        {
            accessorKey: "name",
            header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        },
        {
            accessorKey: "description",
            header: ({ column }) => <ColumnHeader column={column} title="Description" />,
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title="Active" />,
        },
        helpers.actionsColumn(),
    ]
}