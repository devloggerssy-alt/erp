import type { ColumnDef } from "@tanstack/react-table"
import type { UnitsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createUnitsColumns(
    helpers: ResourceTableHelpers<UnitsClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<UnitsClient>>[] {
    return [
        {
            accessorKey: "name",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
        },
        {
            accessorKey: "abbreviation",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("abbreviation")} />,
        },
        helpers.actionsColumn(),
    ]
}
