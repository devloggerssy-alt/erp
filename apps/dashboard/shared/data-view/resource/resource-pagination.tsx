"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select"
import { useResourceContext } from "./resource-context"

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100]

export function ResourcePagination() {
    const t = useTranslations("system.resourcePagination")
    const { pagination, handleChange } = useResourceContext()
    const { page, pageSize, pageCount, total } = pagination

    const canPrevious = page > 1
    const canNext = page < pageCount

    const goToPage = (p: number) => {
        handleChange({
            type: "pagination",
            pagination: { page: p, pageSize, pageCount, total },
        })
    }

    const changePageSize = (size: number) => {
        handleChange({
            type: "pagination",
            pagination: { page: 1, pageSize: size, pageCount, total },
        })
    }

    return (
        <div data-slot="resource-pagination" className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
                {t("summary", { page, pageCount, total })}
            </div>
            <div className="flex items-center gap-6 lg:gap-8">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{t("rowsPerPage")}</p>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => changePageSize(Number(value))}
                    >
                        <SelectTrigger size="sm" className="w-17.5">
                            <SelectValue placeholder={String(pageSize)} />
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
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => goToPage(1)}
                        disabled={!canPrevious}
                    >
                        <ChevronsLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => goToPage(page - 1)}
                        disabled={!canPrevious}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => goToPage(page + 1)}
                        disabled={!canNext}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => goToPage(pageCount)}
                        disabled={!canNext}
                    >
                        <ChevronsRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}