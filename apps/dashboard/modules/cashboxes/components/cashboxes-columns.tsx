"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { CashboxesClient, CrudListDataItem } from "@devloggers/api-client"
import type { ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader, BooleanCell } from "@/shared/data-view/table-view"

type DataItemType = CrudListDataItem<CashboxesClient>

export function createCashboxesColumns(
    helpers: ResourceTableHelpers<CashboxesClient>,
): ColumnDef<DataItemType>[] {
    return [
        {
            accessorKey: "code",
            header: ({ column }) => <ColumnHeader column={column} title="Code" />,
            cell: ({ row }) => (
                <span className="font-mono text-sm font-medium">{row.getValue("code")}</span>
            ),
        },
        {
            accessorKey: "name",
            header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title="Active" />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        {
            accessorKey: "balance",
            header: ({ column }) => <ColumnHeader column={column} title="Balance" />,
        },
        helpers.actionsColumn(),
    ]
}
