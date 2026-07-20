import type { ColumnDef } from "@tanstack/react-table"

export type OpeningStockRow = {
  id: string
  itemId: string
  code: string
  name: string
  category: string
  currentQty: number
  openingQty: number
  unitCost: number
}

export function createOpeningStockColumns(
  t: (key: string) => string,
): ColumnDef<OpeningStockRow, unknown>[] {
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
      id: "category",
      accessorKey: "category",
      header: t("category"),
    },
    {
      id: "currentQty",
      accessorKey: "currentQty",
      header: t("currentQty"),
      cell: ({ getValue }) => {
        const val = getValue() as number
        return val.toLocaleString()
      },
    },
    {
      id: "openingQty",
      accessorKey: "openingQty",
      header: t("openingQty"),
    },
    {
      id: "unitCost",
      accessorKey: "unitCost",
      header: t("unitCost"),
    },
  ]
}
