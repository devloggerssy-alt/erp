"use client"

import type { ColumnDef, Row } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

export type ActionsColumnOptions<TData> = {
    onEdit?: (row: TData) => void
    onDelete?: (row: TData) => Promise<unknown>
}

export function createActionsColumn<TData extends { id: string | number }>(
    options: ActionsColumnOptions<TData>,
): ColumnDef<TData, unknown> {
    return {
        id: "actions",
        header: () => <ActionsHeader />,
        cell: ({ row }) => <ActionsCell row={row} options={options} />,
        enableSorting: false,
        enableHiding: false,
    }
}

function ActionsHeader() {
    const t = useTranslations("system.tableActions")
    return <span className="sr-only">{t("header")}</span>
}

function ActionsCell<TData extends { id: string | number }>({
    row,
    options,
}: {
    row: Row<TData>
    options: ActionsColumnOptions<TData>
}) {
    const t = useTranslations("system.tableActions")

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">{t("openMenu")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {options.onEdit && (
                    <DropdownMenuItem onClick={() => options.onEdit!(row.original)}>
                        <Pencil className="size-3.5 text-muted-foreground" />
                        {t("edit")}
                    </DropdownMenuItem>
                )}
                {options.onDelete && (
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => options.onDelete!(row.original)}
                    >
                        <Trash2 className="size-3.5" />
                        {t("delete")}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
