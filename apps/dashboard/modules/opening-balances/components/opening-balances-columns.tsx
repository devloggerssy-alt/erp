import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/shared/components/ui/badge"

export type OpeningBalanceRow = {
  id: string
  code: string
  name: string
  type: string
  currentBalance: number
  openingAmount: number
}

export function createOpeningBalancesColumns(
  t: (key: string) => string,
): ColumnDef<OpeningBalanceRow, unknown>[] {
  return [
    {
      id: "code",
      accessorKey: "code",
      header: t("code"),
    },
    {
      id: "name",
      accessorKey: "name",
      header: t("name"),
    },
    {
      id: "type",
      accessorKey: "type",
      header: t("type"),
      cell: ({ getValue }) => {
        const type = getValue() as string
        return <Badge variant="outline">{type}</Badge>
      },
    },
    {
      id: "currentBalance",
      accessorKey: "currentBalance",
      header: t("currentBalance"),
      cell: ({ getValue }) => {
        const val = getValue() as number
        return val.toLocaleString()
      },
    },
    {
      id: "openingAmount",
      accessorKey: "openingAmount",
      header: t("openingAmount"),
    },
  ]
}
