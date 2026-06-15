import type { ColumnDef } from "@tanstack/react-table"
import type { StockBalancesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createStockBalancesColumns(
    _helpers: ResourceTableHelpers<StockBalancesClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<StockBalancesClient>>[] {
    return [
        {
            accessorKey: "warehouseName",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("warehouse")} />,
        },
        {
            accessorKey: "itemCode",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("itemCode")} />,
        },
        {
            accessorKey: "itemName",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("itemName")} />,
        },
        {
            accessorKey: "quantity",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("quantity")} />,
        },
        {
            accessorKey: "averageCost",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("averageCost")} />,
            cell: ({ row }) => {
                const val = row.getValue("averageCost") as number
                return val.toLocaleString()
            },
        },
        {
            accessorKey: "updatedAt",
            header: ({ column }) => <ColumnHeader column={column} title={t("updatedAt")} />,
            cell: ({ row }) => {
                const val = row.getValue("updatedAt") as string
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
    ]
}
