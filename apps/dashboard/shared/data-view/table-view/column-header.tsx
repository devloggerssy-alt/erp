"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

interface ColumnHeaderProps<TData, TValue> extends React.ComponentProps<"div"> {
    column: Column<TData, TValue>
    title: string
}

export function ColumnHeader<TData, TValue>({
    column,
    title,
    className,
}: ColumnHeaderProps<TData, TValue>) {
    const isSortable = column.getCanSort()
    const hasDropdown = isSortable

    return (
        <div data-slot="column-header" className={cn("flex items-center gap-1", className)}>
            {hasDropdown ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1">
                            <span>{title}</span>
                            {column.getIsSorted() === "desc" ? (
                                <ArrowDown className="size-3.5" />
                            ) : column.getIsSorted() === "asc" ? (
                                <ArrowUp className="size-3.5" />
                            ) : (
                                <ArrowUpDown className="size-3.5" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {isSortable && (
                            <>
                                <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                                    <ArrowUp className="size-3.5 text-muted-foreground" />
                                    Asc
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                                    <ArrowDown className="size-3.5 text-muted-foreground" />
                                    Desc
                                </DropdownMenuItem>
                                {column.getIsSorted() && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => column.clearSorting()}>
                                            <X className="size-3.5 text-muted-foreground" />
                                            Clear
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </>
                        )}
                        {column.getCanHide() && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                                    <EyeOff className="size-3.5 text-muted-foreground" />
                                    Hide
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <span className="text-sm font-medium">{title}</span>
            )}
        </div>
    )
}
