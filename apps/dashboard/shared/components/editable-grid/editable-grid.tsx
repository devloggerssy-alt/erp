"use client"

import { useState, useCallback, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type CellContext,
} from "@tanstack/react-table"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/shared/components/ui/table"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Inbox } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"
import type { EditableGridProps } from "./editable-grid.types"

function EditableCell<TData, TValue>({
  getValue,
  row,
  column,
  table,
}: CellContext<TData, TValue>) {
  const initialValue = getValue() as number
  const [value, setValue] = useState(initialValue)
  const meta = table.options.meta as { updateData?: (rowId: string, columnId: string, value: number) => void } | undefined

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return (
    <Input
      type="number"
      className="h-8 w-28"
      value={value || ""}
      onChange={(e) => {
        const num = e.target.value === "" ? 0 : Number(e.target.value)
        setValue(num)
        meta?.updateData?.(row.id, column.id, num)
      }}
    />
  )
}

export function EditableGrid<TData>({
  data,
  columns,
  editableColumnIds,
  getRowId,
  onDirtyChange,
  toolbarStart,
  toolbarEnd,
  isLoading = false,
  emptyMessage,
}: EditableGridProps<TData>) {
  const t = useTranslations("system.dataView")
  const [editedValues, setEditedValues] = useState<Record<string, Record<string, number>>>({})

  const updateData = useCallback(
    (rowId: string, columnId: string, value: number) => {
      setEditedValues((prev) => {
        const next = { ...prev, [rowId]: { ...(prev[rowId] ?? {}), [columnId]: value } }
        return next
      })
    },
    [],
  )

  useEffect(() => {
    if (!onDirtyChange) return
    const dirtyRows: Record<string, TData> = {}
    for (const [rowId, values] of Object.entries(editedValues)) {
      const hasNonZero = Object.values(values).some((v) => v !== 0)
      if (hasNonZero) {
        const original = data.find((_, i) => getRowId(data[i]) === rowId)
        if (original) {
          dirtyRows[rowId] = { ...original, ...values } as TData
        }
      }
    }
    onDirtyChange(dirtyRows)
  }, [editedValues, data, getRowId, onDirtyChange])

  const wrappedColumns: ColumnDef<TData, unknown>[] = columns.map((col) => {
    const colId = "id" in col ? col.id : undefined
    if (colId && editableColumnIds.includes(colId)) {
      return { ...col, cell: EditableCell }
    }
    return col
  })

  const table = useReactTable({
    data,
    columns: wrappedColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    meta: { updateData },
  })

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {(toolbarStart || toolbarEnd) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">{toolbarStart}</div>
          <div className="flex items-center gap-3">{toolbarEnd}</div>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="size-8" />
                    <span>{emptyMessage ?? t("empty")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isDirty = !!editedValues[row.id] && Object.values(editedValues[row.id]).some((v) => v !== 0)
                return (
                  <TableRow key={row.id} className={cn(isDirty && "bg-muted/50")}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
