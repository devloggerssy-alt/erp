"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import type { InvoiceStatus } from "../invoices.config"

type InvoiceStatusBadgeProps = {
    status: InvoiceStatus | undefined
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
    const t = useTranslations("business.resources.invoices")

    if (!status) return null

    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs font-medium",
                status === "POSTED" && "border-green-500 text-green-700 dark:text-green-400",
                status === "CANCELLED" && "border-destructive text-destructive",
                status === "DRAFT" && "border-muted-foreground text-muted-foreground",
            )}
        >
            {status === "POSTED"
                ? t("status.posted")
                : status === "CANCELLED"
                    ? t("status.cancelled")
                    : t("status.draft")}
        </Badge>
    )
}
