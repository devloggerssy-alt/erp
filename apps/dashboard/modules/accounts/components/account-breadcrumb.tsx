"use client"

import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { BreadcrumbCrumb } from "../accounts.types"

export function AccountBreadcrumb({
    crumbs,
    onSelect,
}: {
    crumbs: BreadcrumbCrumb[]
    onSelect: (id: string | null) => void
}) {
    const t = useTranslations("business.resources.accounts")
    return (
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <button type="button" onClick={() => onSelect(null)} className="hover:text-foreground hover:underline">
                {t("breadcrumb.root")}
            </button>
            {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1
                return (
                    <span key={c.id} className="flex items-center gap-1">
                        <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />
                        <button
                            type="button"
                            onClick={() => onSelect(c.id)}
                            className={cn("hover:text-foreground hover:underline", isLast && "font-medium text-foreground")}
                        >
                            <code className="font-mono text-xs">{c.code}</code> {c.label}
                        </button>
                    </span>
                )
            })}
        </nav>
    )
}
