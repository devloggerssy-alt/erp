import type { ColumnDef } from "@tanstack/react-table"
import type { DocumentSequencesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createDocumentSequencesColumns(
    helpers: ResourceTableHelpers<DocumentSequencesClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<DocumentSequencesClient>>[] {
    return [
        {
            accessorKey: "documentType",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("documentType")} />,
        },
        {
            accessorKey: "prefix",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("prefix")} />,
        },
        {
            accessorKey: "nextNumber",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("nextNumber")} />,
        },
        {
            accessorKey: "padding",
            header: ({ column }) => <ColumnHeader column={column} title={t("padding")} />,
        },
        helpers.actionsColumn(),
    ]
}
