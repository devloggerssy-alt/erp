import type { ColumnDef } from "@tanstack/react-table"
import type { CustomFieldResponseDto } from "@devloggers/api-contracts"
import type { ItemsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { buildCustomFieldColumns } from "@/shared/custom-fields"
import { BooleanCell, ColumnHeader, type ActionsColumnOptions } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createItemsColumns(
    helpers: ResourceTableHelpers<ItemsClient>,
    t: ColumnTranslator,
    options?: {
        actions?: Partial<ActionsColumnOptions<ResourceItem<ItemsClient>>>
        customFieldDefinitions?: CustomFieldResponseDto[]
        locale?: string
    },
): ColumnDef<ResourceItem<ItemsClient>>[] {
    const customColumns =
        options?.customFieldDefinitions && options?.locale
            ? buildCustomFieldColumns<ResourceItem<ItemsClient>>(options.customFieldDefinitions, options.locale)
            : []

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
            accessorKey: "itemType",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("itemType")} />,
            cell: ({ row }) => <span className="capitalize">{row.getValue("itemType") as string}</span>,
        },
        {
            accessorKey: "barcode",
            header: ({ column }) => <ColumnHeader column={column} title={t("barcode")} />,
        },
        {
            accessorKey: "defaultSellingPrice",
            enableSorting: true,
            header: ({ column }) => <ColumnHeader column={column} title={t("defaultSellingPrice")} />,
            cell: ({ row }) => {
                const value = row.getValue("defaultSellingPrice") as number | null
                return value != null ? value.toLocaleString() : "—"
            },
        },
        ...customColumns,
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        helpers.actionsColumn(options?.actions),
    ]
}
