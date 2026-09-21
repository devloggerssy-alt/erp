import type { ColumnDef } from "@tanstack/react-table"
import type { BrandsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createBrandsColumns(
    helpers: ResourceTableHelpers<BrandsClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<BrandsClient>>[] {
    return [
        {
            id: "name",
            enableSorting: true,
            accessorFn: (row) => row.name,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
            cell: ({ row }) => {
                const brand = row.original
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
            accessorFn: (row) => row.isActive,
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.original.isActive} />,
        },
        helpers.actionsColumn(),
    ]
}
