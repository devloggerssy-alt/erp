import type { ColumnDef } from "@tanstack/react-table"
import type { FiscalPeriodsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"
import { Badge } from "@/shared/components/ui/badge"

type ColumnTranslator = (key: string) => string

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
    OPEN: "default",
    CLOSED: "secondary",
    LOCKED: "destructive",
}

export function createFiscalPeriodsColumns(
    helpers: ResourceTableHelpers<FiscalPeriodsClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<FiscalPeriodsClient>>[] {
    return [
        {
            accessorKey: "name",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
        },
        {
            accessorKey: "startDate",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("startDate")} />,
            cell: ({ row }) => {
                const val = row.getValue("startDate") as string
                return val ? new Date(val).toLocaleDateString() : ""
            },
        },
        {
            accessorKey: "endDate",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("endDate")} />,
            cell: ({ row }) => {
                const val = row.getValue("endDate") as string
                return val ? new Date(val).toLocaleDateString() : ""
            },
        },
        {
            accessorKey: "status",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("status")} />,
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                return (
                    <Badge variant={statusVariant[status] ?? "secondary"}>
                        {t(`status_${status}`)}
                    </Badge>
                )
            },
        },
        helpers.actionsColumn(),
    ]
}
