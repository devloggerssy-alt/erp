import type { ColumnDef } from "@tanstack/react-table"
import type { UnitsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"

export function createUnitsColumns(
    helpers: ResourceTableHelpers<UnitsClient>,
): ColumnDef<ResourceItem<UnitsClient>>[] {
    return [
        {
            accessorKey: "name",
            header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        },
        {
            accessorKey: "abbreviation",
            header: ({ column }) => <ColumnHeader column={column} title="Abbreviation" />,
        },
        helpers.actionsColumn(),
    ]
}