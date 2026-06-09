import type { ColumnDef } from "@tanstack/react-table"
import type { ItemsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader, type ActionsColumnOptions } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createItemsColumns(
    helpers: ResourceTableHelpers<ItemsClient>,
    t: ColumnTranslator,
    actions?: Partial<ActionsColumnOptions<ResourceItem<ItemsClient>>>,
): ColumnDef<ResourceItem<ItemsClient>>[] {    return [
        {
            accessorKey: "code",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("code")} />,
        },
        {
            accessorKey: "name",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
        },
        {
            accessorKey: "barcode",
            header: ({ column }) => <ColumnHeader column={column} title={t("barcode")} />,
        },
        {
            accessorKey: "defaultSellingPrice",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("defaultSellingPrice")} />,
            cell: ({ row }) => {
                const value = row.getValue("defaultSellingPrice") as number | null
                return value != null ? value.toLocaleString() : "—"
            },
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        helpers.actionsColumn(actions),
    ]
}