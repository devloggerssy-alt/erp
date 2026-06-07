import type { ColumnDef } from "@tanstack/react-table"
import type { CategoriesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createCategoriesColumns(
    helpers: ResourceTableHelpers<CategoriesClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<CategoriesClient>>[] {
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
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        helpers.actionsColumn(),
    ]
}
