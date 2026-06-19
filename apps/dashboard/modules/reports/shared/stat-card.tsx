import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"

type StatCardProps = {
    title: string
    value: string | number
    icon?: LucideIcon
    variant?: "default" | "success" | "warning" | "danger"
    subtitle?: string
}

const variantClass: Record<string, string> = {
    default: "text-primary",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-rose-600",
}

export function StatCard({ title, value, icon: Icon, variant = "default", subtitle }: StatCardProps) {
    return (
        <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                {Icon && <Icon className={cn("h-4 w-4 shrink-0", variantClass[variant])} />}
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", variantClass[variant])}>{value}</div>
                {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
            </CardContent>
        </Card>
    )
}
