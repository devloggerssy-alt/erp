import type { ColumnDef } from "@tanstack/react-table"
import type { CatalogEntitiesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"
import { Badge } from "@/shared/components/ui/badge"

type ColumnTranslator = (key: string) => string

type CatalogEntityRow = {
    id: string
    name: string
    kind: string
    parent?: { name: string; kind: string } | null
    isActive: boolean
}

function asRow(item: ResourceItem<CatalogEntitiesClient>): CatalogEntityRow {
    return item as unknown as CatalogEntityRow
}

export function createCatalogEntitiesColumns(
    helpers: ResourceTableHelpers<CatalogEntitiesClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<CatalogEntitiesClient>>[] {
    return [
        {
            id: "name",
            enableSorting: true,
            accessorFn: (row) => asRow(row).name,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
            cell: ({ row }) => asRow(row.original).name,
        },
        {
            id: "kind",
            accessorFn: (row) => asRow(row).kind,
            header: ({ column }) => <ColumnHeader column={column} title={t("kind")} />,
            cell: ({ row }) => {
                const kind = asRow(row.original).kind
                return kind ? <Badge variant="secondary">{kind}</Badge> : null
            },
        },
        {
            id: "parent",
            header: ({ column }) => <ColumnHeader column={column} title={t("parent")} />,
            cell: ({ row }) => {
                const parent = asRow(row.original).parent
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
            accessorFn: (row) => asRow(row).isActive,
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={asRow(row.original).isActive} />,
        },
        helpers.actionsColumn(),
    ]
}
