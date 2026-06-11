import type { ColumnDef } from "@tanstack/react-table"
import type { TagsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createTagsColumns(
    helpers: ResourceTableHelpers<TagsClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<TagsClient>>[] {
    return [
        {
            accessorKey: "name",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
        },
        {
            accessorKey: "color",
            header: ({ column }) => <ColumnHeader column={column} title={t("color")} />,
            cell: ({ row }) => {
                const color = row.getValue("color") as string | null
                if (!color) return <span className="text-muted-foreground">—</span>
                return (
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-block h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: color }}
                        />
                        <span>{color}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "module",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("module")} />,
            cell: ({ row }) => (
                <span className="capitalize">{row.getValue("module") as string}</span>
            ),
        },
        helpers.actionsColumn(),
    ]
}
