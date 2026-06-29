"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"
import type { ICrudClient } from "@devloggers/api-client"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { useResourceContext } from "./resource-context"

export type ResourceSelectionToolbarProps = {
    children?: ReactNode
    className?: string
}

export function ResourceSelectionToolbar<TClient extends ICrudClient = ICrudClient>({
    children,
    className,
}: ResourceSelectionToolbarProps) {
    const { selectedItems, clearSelection } = useResourceContext<TClient>()
    const t = useTranslations("system.selectionToolbar")

    if (selectedItems.length === 0) return null

    return (
        <div
            className={cn(
                "mb-3 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5",
                className,
            )}
        >
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                {t("selected", { count: selectedItems.length })}
            </span>
            {children}
            <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
                <X className="size-3.5" />
                {t("clear")}
            </Button>
        </div>
    )
}
