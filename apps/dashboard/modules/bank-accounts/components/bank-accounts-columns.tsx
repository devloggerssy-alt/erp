"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { BankAccountsClient, CrudListDataItem } from "@devloggers/api-client"
import type { ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader, BooleanCell } from "@/shared/data-view/table-view"

type DataItemType = CrudListDataItem<BankAccountsClient>

export function createBankAccountsColumns(
    helpers: ResourceTableHelpers<BankAccountsClient>,
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
            accessorKey: "bankName",
            header: ({ column }) => <ColumnHeader column={column} title="Bank" />,
        },
        {
            accessorKey: "accountNumber",
            header: ({ column }) => <ColumnHeader column={column} title="Account Number" />,
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
