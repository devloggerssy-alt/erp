import type { ColumnDef } from "@tanstack/react-table"
import type { ICrudClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

type BrandRow = {
    id: string
    name: string
    imageUrl: string | null
    isActive: boolean
}

function asRow(item: ResourceItem<ICrudClient>): BrandRow {
    return item as unknown as BrandRow
}

export function createBrandsColumns(
    helpers: ResourceTableHelpers<ICrudClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<ICrudClient>>[] {
    return [
        {
            id: "name",
            enableSorting: true,
            accessorFn: (row) => asRow(row).name,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
            cell: ({ row }) => {
                const brand = asRow(row.original)
                return (
                    <div className="flex items-center gap-2">
                        {brand.imageUrl && (
                            <img
                                src={brand.imageUrl}
                                alt={brand.name}
                                className="h-6 w-6 rounded object-contain"
                            />
                        )}
                        <span>{brand.name}</span>
                    </div>
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
