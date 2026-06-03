"use client"

import type { Table } from "@tanstack/react-table"
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select"
import { IconTooltip } from "@/shared/components/icon-tooltip"
import { useDataView } from "./data-view-context"

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100]

interface DataViewPaginationProps<TData> {
    table: Table<TData>
}

export function DataViewPagination<TData>({ table }: DataViewPaginationProps<TData>) {
    const tPagination = useTranslations("system.resourcePagination")
    const t = useTranslations("system.dataView")
    const { pagination } = useDataView()

    return (
        <div
            data-slot="data-view-pagination"
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
            <p className="text-sm text-muted-foreground">
                {tPagination("summary", {
                    page: pagination.page,
                    pageCount: pagination.pageCount,
                    total: pagination.total,
                })}
            </p>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                        {tPagination("rowsPerPage")}
                    </p>
                    <Select
                        value={String(pagination.pageSize)}
                        onValueChange={(value) => table.setPageSize(Number(value))}
                    >
                        <SelectTrigger size="sm" className="w-17.5 bg-background">
                            <SelectValue placeholder={String(pagination.pageSize)} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-1">
                    <IconTooltip label={t("firstPage")}>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="bg-background"
                            onClick={() => table.firstPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronsLeft className="size-4" />
                            <span className="sr-only">{t("firstPage")}</span>
                        </Button>
                    </IconTooltip>
                    <IconTooltip label={t("previousPage")}>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="bg-background"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft className="size-4" />
                            <span className="sr-only">{t("previousPage")}</span>
                        </Button>
                    </IconTooltip>
                    <IconTooltip label={t("nextPage")}>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="bg-background"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronRight className="size-4" />
                            <span className="sr-only">{t("nextPage")}</span>
                        </Button>
                    </IconTooltip>
                    <IconTooltip label={t("lastPage")}>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="bg-background"
                            onClick={() => table.lastPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronsRight className="size-4" />
                            <span className="sr-only">{t("lastPage")}</span>
                        </Button>
                    </IconTooltip>
                </div>
            </div>
        </div>
    )
}
