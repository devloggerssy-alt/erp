import type { ColumnDef } from "@tanstack/react-table"
import type { StockCountsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"
import { Badge } from "@/shared/components/ui/badge"

type ColumnTranslator = (key: string) => string

function StatusBadge({ status }: { status: string }) {
    const variant =
        status === "POSTED" ? "default" :
        status === "CANCELLED" ? "destructive" :
        "secondary"
    return <Badge variant={variant}>{status}</Badge>
}

export function createStockCountsColumns(
    _helpers: ResourceTableHelpers<StockCountsClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<StockCountsClient>>[] {
    return [
        {
            accessorKey: "number",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("number")} />,
        },
        {
            accessorKey: "date",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("date")} />,
            cell: ({ row }) => {
                const val = row.getValue("date") as string
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
        {
            accessorKey: "warehouseName",
            header: ({ column }) => <ColumnHeader column={column} title={t("warehouse")} />,
        },
        {
            accessorKey: "status",
            header: ({ column }) => <ColumnHeader column={column} title={t("status")} />,
            cell: ({ row }) => <StatusBadge status={row.getValue("status") as string} />,
        },
        {
            accessorKey: "lineCount",
            header: ({ column }) => <ColumnHeader column={column} title={t("lineCount")} />,
        },
        {
            accessorKey: "createdAt",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("createdAt")} />,
            cell: ({ row }) => {
                const val = row.getValue("createdAt") as string
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
    ]
}
