"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import type { InvoicePaidStatus } from "@devloggers/api-contracts"

type InvoicePaidStatusBadgeProps = {
    status: InvoicePaidStatus | undefined
    invoiceStatus: string | undefined
}

// Paid state is only meaningful once an invoice has actually been posted.
export function InvoicePaidStatusBadge({ status, invoiceStatus }: InvoicePaidStatusBadgeProps) {
    const t = useTranslations("business.resources.invoices")

    if (!status || invoiceStatus !== "POSTED") return null

    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs font-medium",
                status === "PAID" && "border-green-500 text-green-700 dark:text-green-400",
                status === "PARTIAL" && "border-amber-500 text-amber-700 dark:text-amber-400",
                status === "UNPAID" && "border-muted-foreground text-muted-foreground",
            )}
        >
            {status === "PAID"
                ? t("paidStatus.paid")
                : status === "PARTIAL"
                    ? t("paidStatus.partial")
                    : t("paidStatus.unpaid")}
        </Badge>
    )
}
