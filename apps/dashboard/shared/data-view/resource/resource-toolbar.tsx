"use client"

import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export type ResourceToolbarProps = {
    children: ReactNode
    className?: string
}

export function ResourceToolbar({ children, className }: ResourceToolbarProps) {
    return (
        <div
            data-slot="resource-toolbar"
            className={cn("flex flex-wrap items-center gap-3", className)}
        >
            {children}
        </div>
    )
}
