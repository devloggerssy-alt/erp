"use client"

import { ArrowRight, Check, Lock, Minus, Play } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import type { SetupTask, SetupTaskType } from "../hooks/use-business-setup"
import { EXECUTABLE_TASK_TYPES, SETUP_TASK_LINKS, isTaskDone } from "../setup.config"
import { SETUP_TASK_ICONS } from "./setup-icons"

type Props = {
  task: SetupTask
  taskByType: ReadonlyMap<SetupTaskType, SetupTask>
  onExecute: (type: SetupTaskType) => void
  onSkip: (type: SetupTaskType) => void
  pendingType: SetupTaskType | null
  isNext: boolean
}

export function SetupTaskRow({ task, taskByType, onExecute, onSkip, pendingType, isNext }: Props) {
  const t = useTranslations("business.businessSetup")
  const blockingDependencies = task.dependencies.filter((dependency) => {
    const dependencyTask = taskByType.get(dependency)
    return !dependencyTask || !isTaskDone(dependencyTask)
  })
  // RECONCILIATION is run from its sidebar panel, which also lists the failing checks.
  const isExecutable =
    EXECUTABLE_TASK_TYPES.includes(task.type) && task.type !== "RECONCILIATION" && task.status === "READY"
  const isTerminal = isTaskDone(task)
  const isBlocked = task.status === "BLOCKED"
  const isPending = pendingType === task.type

  return (
    <li
      className={cn(
        "group/row flex flex-col gap-3 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:gap-4",
        isNext ? "bg-primary/5" : "hover:bg-muted/40",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TaskTile task={task} />
        <div className="min-w-0 space-y-0.5">
          <p className={cn("text-sm font-medium", isTerminal && "text-muted-foreground")}>
            {t(`tasks.${task.type}`)}
          </p>
          {blockingDependencies.length > 0 && !isTerminal ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3 shrink-0" aria-hidden />
              <span className="truncate">
                {t("blockedBy", {
                  tasks: blockingDependencies.map((dependency) => t(`tasks.${dependency}`)).join(", "),
                })}
              </span>
            </p>
          ) : (
            <p className="truncate text-xs text-muted-foreground">{t(`descriptions.${task.type}`)}</p>
          )}
        </div>
      </div>

      {isTerminal ? (
        <span className="ms-12 text-xs font-medium text-muted-foreground sm:ms-0">{t(`status.${task.status}`)}</span>
      ) : (
        <div className="ms-12 flex shrink-0 items-center gap-1 sm:ms-0">
          {task.skippable && (
            <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={isPending} onClick={() => onSkip(task.type)}>
              {isPending ? t("actions.skipping") : t("actions.skip")}
            </Button>
          )}
          {isExecutable ? (
            <Button size="sm" disabled={isPending} onClick={() => onExecute(task.type)}>
              <Play className="size-3.5" aria-hidden />
              {isPending ? t("actions.running") : t("actions.run")}
            </Button>
          ) : task.type !== "RECONCILIATION" ? (
            <Button asChild size="sm" variant={isBlocked ? "ghost" : isNext ? "default" : "outline"}>
              <Link href={SETUP_TASK_LINKS[task.type]}>
                {t("actions.open")}
                <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      )}
    </li>
  )
}

/** Task icon tile; completed and skipped tasks swap their icon for a state glyph. */
function TaskTile({ task }: { task: SetupTask }) {
  const Icon = task.status === "COMPLETED" ? Check : task.status === "SKIPPED" ? Minus : SETUP_TASK_ICONS[task.type]

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
        task.status === "COMPLETED" && "border-transparent bg-primary text-primary-foreground",
        task.status === "SKIPPED" && "border-dashed bg-muted text-muted-foreground",
        task.status === "READY" && "border-primary/30 bg-background text-primary",
        task.status === "BLOCKED" && "bg-muted/60 text-muted-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  )
}
