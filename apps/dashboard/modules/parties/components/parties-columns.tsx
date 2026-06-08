import type { ColumnDef } from "@tanstack/react-table"
import type { PartiesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createPartiesColumns(
    helpers: ResourceTableHelpers<PartiesClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<PartiesClient>>[] {
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
            accessorKey: "type",
            header: ({ column }) => <ColumnHeader column={column} title={t("type")} />,
            cell: ({ row }) => t(`type_${row.getValue("type")}`),
        },
        {
            accessorKey: "phone",
            header: ({ column }) => <ColumnHeader column={column} title={t("phone")} />,
        },
        {
            accessorKey: "email",
            header: ({ column }) => <ColumnHeader column={column} title={t("email")} />,
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        helpers.actionsColumn(),
    ]
}
