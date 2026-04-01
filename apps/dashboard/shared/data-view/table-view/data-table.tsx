"use client"

import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
} from "@tanstack/react-table"
import {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
} from "@/shared/components/ui/table"
import { DataViewProvider } from "./data-view-context"
 import type { DataViewProps } from "./types"
import { DataViewPagination } from "./data-view-pagination"
import { Skeleton } from "@/shared/components/ui/skeleton"

export function DataTable<TData>({
    columns,
    data,
    pagination,
    sorting = [],
    onChange,
    isLoading = false,
    onRowClick,
    slots,
}: DataViewProps<TData>) {
    const table = useReactTable({
        data,
        columns: columns as ColumnDef<TData, unknown>[],
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        pageCount: pagination.pageCount,
        state: {
            sorting,
            pagination: {
                pageIndex: pagination.page - 1,
                pageSize: pagination.pageSize,
            },
        },
        onSortingChange: (updater) => {
            const next = typeof updater === "function" ? updater(sorting) : updater
            onChange({ type: "sorting", sorting: next })
        },
        onPaginationChange: (updater) => {
            const current = { pageIndex: pagination.page - 1, pageSize: pagination.pageSize }
            const next = typeof updater === "function" ? updater(current) : updater
            onChange({
                type: "pagination",
                pagination: {
                    page: next.pageIndex + 1,
                    pageSize: next.pageSize,
                    pageCount: pagination.pageCount,
                    total: pagination.total,
                },
            })
        },
    })

    return (
        <DataViewProvider
            pagination={pagination}
            sorting={sorting}
            onChange={onChange}
            isLoading={isLoading}
        >
            <div data-slot="data-view" className="flex flex-col gap-2">
                {slots?.actions && (
                    <div data-slot="data-view-actions">{slots.actions}</div>
                )}
                <div className="rounded-md border overflow-auto">
                    <Table className="w-full">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                            {slots?.extraHeader}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: pagination.pageSize }).map((_, i) => (
                                    <TableRow key={`skeleton-${i}`}>
                                        {columns.map((_, j) => (
                                            <TableCell key={`skeleton-${i}-${j}`}>
                                                <Skeleton className="h-10 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={onRowClick ? "cursor-pointer" : undefined}
                                        onClick={() => onRowClick?.(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                            {slots?.extraBody}
                        </TableBody>
                        {slots?.footer && (
                            <TableFooter>{slots.footer}</TableFooter>
                        )}
                    </Table>
                </div>
                <DataViewPagination table={table} />
            </div>
        </DataViewProvider>
    )
}
