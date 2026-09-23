"use client"

import { ArrowRight, Lock, PartyPopper, Play } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/shared/components/ui/button"
import type { SetupNextAction, SetupTaskType } from "../hooks/use-business-setup"
import { EXECUTABLE_TASK_TYPES, SETUP_TASK_LINKS } from "../setup.config"
import { SETUP_TASK_ICONS } from "./setup-icons"

type Props = {
  progress: { completed: number; total: number; percent: number }
  completedAt: string | null
  nextAction: SetupNextAction | null
  onExecute: (type: SetupTaskType) => void
  pendingType: SetupTaskType | null
}

/** Header + "up next" in one surface: where you are, and the single thing to do now. */
export function SetupOverview({ progress, completedAt, nextAction, onExecute, pendingType }: Props) {
  const t = useTranslations("business.businessSetup")
  const isDone = !nextAction && progress.completed === progress.total

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-5 p-5 sm:p-6">
        <ProgressRing percent={progress.percent} />
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("hubDescription")}</p>
          <p className="text-xs font-medium text-muted-foreground tabular-nums">
            {completedAt
              ? t("completedAt", { date: new Date(completedAt).toLocaleDateString() })
              : t("overview.requiredCount", { completed: progress.completed, total: progress.total })}
          </p>
        </div>
      </div>

      {nextAction ? (
        <UpNext nextAction={nextAction} onExecute={onExecute} isPending={pendingType === nextAction.type} />
      ) : isDone ? (
        <div className="flex items-center gap-3 border-t bg-primary/5 px-5 py-4 sm:px-6">
          <PartyPopper className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t("overview.allDone")}</p>
            <p className="text-xs text-muted-foreground">{t("overview.allDoneDescription")}</p>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function UpNext({
  nextAction,
  onExecute,
  isPending,
}: {
  nextAction: SetupNextAction
  onExecute: (type: SetupTaskType) => void
  isPending: boolean
}) {
  const t = useTranslations("business.businessSetup")
  const Icon = SETUP_TASK_ICONS[nextAction.type]
  const isReady = nextAction.reason === "READY"
  const isExecutable = isReady && EXECUTABLE_TASK_TYPES.includes(nextAction.type)

  return (
    <div className="flex flex-col gap-4 border-t bg-primary/5 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-primary">{t("overview.upNext")}</p>
          <p className="truncate text-sm font-semibold">{t(`tasks.${nextAction.type}`)}</p>
          <p className="text-xs text-muted-foreground">
            {isReady ? (
              t(`descriptions.${nextAction.type}`)
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3" aria-hidden />
                {t("overview.waitingOn", {
                  blockers: nextAction.blockedBy.map((type) => t(`tasks.${type}`)).join(", "),
                })}
              </span>
            )}
          </p>
        </div>
      </div>

      {isExecutable ? (
        <Button className="shrink-0" disabled={isPending} onClick={() => onExecute(nextAction.type)}>
          <Play className="size-4" aria-hidden />
          {isPending ? t("actions.running") : t("actions.run")}
        </Button>
      ) : nextAction.type !== "RECONCILIATION" ? (
        <Button asChild className="shrink-0" variant={isReady ? "default" : "outline"}>
          <Link href={SETUP_TASK_LINKS[nextAction.type]}>
            {t("actions.open")}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(Math.max(percent, 0), 100) / 100)

  return (
    <div className="relative size-16 shrink-0" role="img" aria-label={`${percent}%`}>
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" className="stroke-muted" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
        {percent}%
      </span>
    </div>
  )
}
