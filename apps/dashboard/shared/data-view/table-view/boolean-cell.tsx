"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"

export type BooleanCellProps = {
    value: boolean | null | undefined
    className?: string
}

export function BooleanCell({ value, className }: BooleanCellProps) {
    const t = useTranslations("system.booleanCell")
    const isActive = Boolean(value)

    return (
        <Badge
            variant="outline"
            className={cn(
                "gap-1.5 border-transparent px-2.5 font-medium",
                isActive
                    ? "bg-primary/12 text-primary dark:bg-primary/20"
                    : "bg-muted text-muted-foreground",
                className,
            )}
        >
            <span
                aria-hidden
                className={cn(
                    "size-1.5 rounded-full",
                    isActive ? "bg-primary" : "bg-muted-foreground/60",
                )}
            />
            {isActive ? t("active") : t("inactive")}
        </Badge>
    )
}
