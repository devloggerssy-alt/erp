import type { ColumnDef } from "@tanstack/react-table"
import type { ReactNode } from "react"

export type EditableGridProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  editableColumnIds: string[]
  getRowId: (row: TData) => string
  onDirtyChange?: (dirtyRows: Record<string, TData>) => void
  toolbarStart?: ReactNode
  toolbarEnd?: ReactNode
  isLoading?: boolean
  emptyMessage?: string
}
