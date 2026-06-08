import type { ColumnDef } from "@tanstack/react-table"
import type { CurrenciesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createCurrenciesColumns(
    helpers: ResourceTableHelpers<CurrenciesClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<CurrenciesClient>>[] {
    return [
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
            accessorKey: "symbol",
            header: ({ column }) => <ColumnHeader column={column} title={t("symbol")} />,
        },
        {
            accessorKey: "isBase",
            header: ({ column }) => <ColumnHeader column={column} title={t("isBase")} />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isBase") as boolean} />,
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        helpers.actionsColumn(),
    ]
}
