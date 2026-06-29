"use client"

import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"

type PaymentStatus = "DRAFT" | "POSTED" | "CANCELLED"

export function PaymentStatusBadge({ status }: { status?: PaymentStatus }) {
    if (!status) return null

    return (
        <Badge
            variant="outline"
            className={cn(
                "font-medium text-xs",
                status === "POSTED" && "border-green-500 text-green-700 dark:text-green-400",
                status === "CANCELLED" && "border-destructive text-destructive",
                status === "DRAFT" && "border-muted-foreground text-muted-foreground",
            )}
        >
            {status}
        </Badge>
    )
}
