import type { ColumnDef } from "@tanstack/react-table"
import type { RolesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createRolesColumns(
    helpers: ResourceTableHelpers<RolesClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<RolesClient>>[] {
    return [
        {
            accessorKey: "name",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
        },
        {
            accessorKey: "description",
            header: ({ column }) => <ColumnHeader column={column} title={t("description")} />,
        },
        helpers.actionsColumn(),
    ]
}
