import type { ColumnDef } from "@tanstack/react-table"
import type { CustomFieldsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"
import { localize } from "@/shared/lib/localize"

type ColumnTranslator = (key: string) => string

export function createCustomFieldsColumns(
    helpers: ResourceTableHelpers<CustomFieldsClient>,
    t: ColumnTranslator,
    locale: string,
): ColumnDef<ResourceItem<CustomFieldsClient>>[] {
    return [
        {
            id: "label",
            accessorFn: (row) => localize(row.label as never, locale, localize(row.name as never, locale)),
            header: ({ column }) => <ColumnHeader column={column} title={t("label")} />,
        },
        {
            accessorKey: "type",
            header: ({ column }) => <ColumnHeader column={column} title={t("type")} />,
        },
        {
            accessorKey: "isRequired",
            header: ({ column }) => <ColumnHeader column={column} title={t("required")} />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isRequired") as boolean} />,
        },
        {
            accessorKey: "showInList",
            header: ({ column }) => <ColumnHeader column={column} title={t("showInList")} />,
            cell: ({ row }) => <BooleanCell value={row.getValue("showInList") as boolean} />,
        },
        helpers.actionsColumn(),
    ]
}
