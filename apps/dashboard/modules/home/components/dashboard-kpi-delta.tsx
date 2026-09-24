import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface DashboardKpiDeltaProps {
    current: number
    previous: number
    /** false for metrics where a rise is unfavorable (e.g. expenses, purchases). */
    higherIsBetter?: boolean
}

export function DashboardKpiDelta({ current, previous, higherIsBetter = true }: DashboardKpiDeltaProps) {
    if (previous === 0) {
        return null
    }

    const change = ((current - previous) / Math.abs(previous)) * 100
    const isFlat = Math.abs(change) < 0.05

    if (isFlat) {
        return <span className="text-xs text-muted-foreground">—</span>
    }

    const isUp = change > 0
    const isFavorable = isUp === higherIsBetter
    const Icon = isUp ? ArrowUpIcon : ArrowDownIcon

    return (
        <span
            className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                isFavorable ? "text-success" : "text-destructive",
            )}
        >
            <Icon className="h-3 w-3" />
            {Math.abs(change).toFixed(1)}%
        </span>
    )
}
