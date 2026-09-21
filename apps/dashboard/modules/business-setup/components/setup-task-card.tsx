"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import type { SetupTask, SetupTaskType } from "../hooks/use-business-setup"
import { EXECUTABLE_TASK_TYPES, SETUP_TASK_LINKS } from "../setup.config"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  COMPLETED: "default",
  READY: "secondary",
  BLOCKED: "outline",
  SKIPPED: "outline",
}

type Props = {
  task: SetupTask
  taskByType: ReadonlyMap<SetupTaskType, SetupTask>
  onExecute: (type: SetupTaskType) => void
  onSkip: (type: SetupTaskType) => void
  pendingType: SetupTaskType | null
}

export function SetupTaskCard({ task, taskByType, onExecute, onSkip, pendingType }: Props) {
  const t = useTranslations("business.businessSetup")
  const blockingDependencies = task.dependencies.filter((dependency) => {
    const dependencyTask = taskByType.get(dependency)
    return !dependencyTask || (dependencyTask.status !== "COMPLETED" && dependencyTask.status !== "SKIPPED")
  })
  const isExecutable = EXECUTABLE_TASK_TYPES.includes(task.type) && task.status === "READY"
  const isTerminal = task.status === "COMPLETED" || task.status === "SKIPPED"
  const isPending = pendingType === task.type

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t(`tasks.${task.type}`)}</p>
            {blockingDependencies.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("blockedBy", { tasks: blockingDependencies.map((dependency) => t(`tasks.${dependency}`)).join(", ") })}
              </p>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[task.status] ?? "outline"}>{t(`status.${task.status}`)}</Badge>
        </div>

        {!isTerminal && (
          <div className="flex flex-wrap gap-2">
            {task.type !== "RECONCILIATION" && (
              <Button asChild size="sm" variant="outline">
                <Link href={SETUP_TASK_LINKS[task.type]}>{t("actions.open")}</Link>
              </Button>
            )}
            {isExecutable && (
              <Button size="sm" disabled={isPending} onClick={() => onExecute(task.type)}>
                {isPending ? t("actions.running") : t("actions.run")}
              </Button>
            )}
            {task.skippable && (
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => onSkip(task.type)}>
                {isPending ? t("actions.skipping") : t("actions.skip")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
