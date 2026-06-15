import type { ColumnDef } from "@tanstack/react-table"
import type { StockMovementsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createStockMovementsColumns(
    _helpers: ResourceTableHelpers<StockMovementsClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<StockMovementsClient>>[] {
    return [
        {
            accessorKey: "createdAt",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("date")} />,
            cell: ({ row }) => {
                const val = row.getValue("createdAt") as string
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
        {
            accessorKey: "movementType",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("type")} />,
            cell: ({ row }) => {
                const val = row.getValue("movementType") as string
                return t(`type_${val}`) ?? val
            },
        },
        {
            accessorKey: "itemCode",
            header: ({ column }) => <ColumnHeader column={column} title={t("itemCode")} />,
        },
        {
            accessorKey: "itemName",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("itemName")} />,
        },
        {
            accessorKey: "warehouseName",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("warehouse")} />,
        },
        {
            accessorKey: "quantity",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("quantity")} />,
        },
        {
            accessorKey: "unitCost",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("unitCost")} />,
            cell: ({ row }) => {
                const val = row.getValue("unitCost") as number
                return val.toLocaleString()
            },
        },
        {
            accessorKey: "referenceType",
            header: ({ column }) => <ColumnHeader column={column} title={t("reference")} />,
            cell: ({ row }) => {
                const refType = row.getValue("referenceType") as string | null
                const refId = (row.original as { referenceId?: string | null }).referenceId
                if (!refType) return "—"
                return refId ? `${refType} / ${refId.slice(0, 8)}…` : refType
            },
        },
    ]
}
