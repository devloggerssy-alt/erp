import type { ReactNode } from "react"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table"
import { Empty, EmptyTitle } from "@/shared/components/ui/empty"

type Column<T> = {
    key: string
    header: string
    render?: (row: T) => ReactNode
    align?: "left" | "right" | "center"
}

type ReportTableProps<T> = {
    columns: Column<T>[]
    rows: T[]
    isLoading?: boolean
    getRowKey: (row: T) => string
}

export function ReportTable<T>({ columns, rows, isLoading, getRowKey }: ReportTableProps<T>) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
            </div>
        )
    }

    if (rows.length === 0) {
        return (
            <Empty className="py-12">
                <EmptyTitle>No data</EmptyTitle>
            </Empty>
        )
    }

    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40">
                        {columns.map((col) => (
                            <TableHead
                                key={col.key}
                                className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}
                            >
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={getRowKey(row)}>
                            {columns.map((col) => (
                                <TableCell
                                    key={col.key}
                                    className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}
                                >
                                    {col.render
                                        ? col.render(row)
                                        : String((row as Record<string, unknown>)[col.key] ?? "—")}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
