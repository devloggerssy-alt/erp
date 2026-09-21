import type { ColumnDef } from "@tanstack/react-table"
import type { CatalogEntitiesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"
import { Badge } from "@/shared/components/ui/badge"

type ColumnTranslator = (key: string) => string

export function createCatalogEntitiesColumns(
    helpers: ResourceTableHelpers<CatalogEntitiesClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<CatalogEntitiesClient>>[] {
    return [
        {
            id: "name",
            enableSorting: true,
            accessorFn: (row) => row.name,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
            cell: ({ row }) => row.original.name,
        },
        {
            id: "kind",
            accessorFn: (row) => row.kind,
            header: ({ column }) => <ColumnHeader column={column} title={t("kind")} />,
            cell: ({ row }) => {
                const kind = row.original.kind
                return kind ? <Badge variant="secondary">{kind}</Badge> : null
            },
        },
        {
            id: "parent",
            header: ({ column }) => <ColumnHeader column={column} title={t("parent")} />,
            cell: ({ row }) => {
                const parent = row.original.parent
                if (!parent) return <span className="text-muted-foreground text-sm">—</span>
                return (
                    <span className="text-sm">
                        {parent.name}
                        <span className="ml-1.5 text-xs text-muted-foreground">({parent.kind})</span>
                    </span>
                )
            },
        },
        {
            id: "isActive",
            accessorFn: (row) => row.isActive,
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.original.isActive} />,
        },
        helpers.actionsColumn(),
    ]
}
