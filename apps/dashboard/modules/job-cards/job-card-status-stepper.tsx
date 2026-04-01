"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import { useAuthApi } from "@/shared/useApi"
import { useJobCard } from "./job-card-context"
import { JOB_CARD_STATUSES, type JobCardStatus } from "./job-card.schema"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import {
    CircleDot,
    LogIn,
    Loader,
    Pause,
    PackageCheck,
    CheckCircle2,
} from "lucide-react"

// ── Status icon mapping ──

const STATUS_ICONS: Record<JobCardStatus, React.ComponentType<{ className?: string }>> = {
    draft: CircleDot,
    check_in: LogIn,
    in_progress: Loader,
    on_hold: Pause,
    ready_to_deliver: PackageCheck,
    delivered: CheckCircle2,
}

// ── Component ──

type JobCardStatusStepperProps = {
    jobCardId: string
}

export function JobCardStatusStepper({ jobCardId }: JobCardStatusStepperProps) {
    const api = useAuthApi()
    const jobCard = useJobCard()
    const currentStatus = jobCard?.status ?? "draft"

    const currentIndex = JOB_CARD_STATUSES.findIndex((s) => s.value === currentStatus)

    const { mutate, isPending, variables } = useMutation({
        mutationFn: async (status: JobCardStatus) => {
            const promise = api.jobCards.changeStatus(jobCardId, { status })
            toast.promise(promise, {
                loading: "Updating status...",
                success: "Status updated successfully",
                error: "Failed to update status",
            })
            return promise
        },
        onSuccess: (_data, status) => {
            jobCard?.setStatus(status)
        },
    })

    const handleClick = (status: JobCardStatus, index: number) => {
        if (isPending) return
        if (status === currentStatus) return
        mutate(status)
    }

    return (
        <TooltipProvider>
            <div className="flex items-center gap-0 overflow-x-auto">
                {JOB_CARD_STATUSES.map((step, index) => {
                    const Icon = STATUS_ICONS[step.value]
                    const isActive = step.value === currentStatus
                    const isCompleted = index < currentIndex
                    const isTransitioning = isPending && variables === step.value
                    const isClickable = !isPending && step.value !== currentStatus

                    return (
                        <div key={step.value} className="flex items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => handleClick(step.value, index)}
                                        disabled={!isClickable}
                                        className={cn(
                                            "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                            isActive && "bg-primary text-primary-foreground shadow-sm",
                                            isCompleted && !isActive && "bg-primary/10 text-primary hover:bg-primary/20",
                                            !isActive && !isCompleted && "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                                            isTransitioning && "animate-pulse",
                                            !isClickable && !isActive && "opacity-60",
                                            isClickable && "cursor-pointer",
                                        )}
                                    >
                                        <Icon className={cn(
                                            "size-4 shrink-0",
                                            isTransitioning && "animate-spin"
                                        )} />
                                        <span className="hidden whitespace-nowrap sm:inline">{step.label}</span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isActive ? `Current: ${step.label}` : `Change to ${step.label}`}
                                </TooltipContent>
                            </Tooltip>

                            {/* Connector line */}
                            {index < JOB_CARD_STATUSES.length - 1 && (
                                <div
                                    className={cn(
                                        "mx-1 h-0.5 w-4 shrink-0 transition-colors",
                                        index < currentIndex ? "bg-primary/40" : "bg-border"
                                    )}
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        </TooltipProvider>
    )
}
