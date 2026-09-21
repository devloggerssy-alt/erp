"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Progress } from "@/shared/components/ui/progress"
import { useBusinessSetup } from "../hooks/use-business-setup"
import { computeSetupProgress, SETUP_GROUPS } from "../setup.config"
import { SetupNextActionCard } from "./setup-next-action"
import { SetupReadinessPanel } from "./setup-readiness-panel"
import { SetupReconciliationPanel } from "./setup-reconciliation-panel"
import { SetupTaskCard } from "./setup-task-card"

export function SetupHub() {
  const t = useTranslations("business.businessSetup")
  const { allowed, isLoading, state, executeTask, skipTask } = useBusinessSetup()

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("noAccess")}</p>
      </div>
    )
  }

  if (isLoading || !state) {
    return <p className="p-6 text-sm text-muted-foreground">{t("loading")}</p>
  }

  const taskByType = new Map(state.tasks.map((task) => [task.type, task]))
  const progress = computeSetupProgress(state.tasks)
  const pendingType = executeTask.isPending
    ? executeTask.variables ?? null
    : skipTask.isPending
      ? skipTask.variables ?? null
      : null

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("hubDescription")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("progress.title")}</CardTitle>
          <CardDescription>
            {t("progress.description", { completed: progress.completed, total: progress.total })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={progress.percent} />
          <p className="text-sm text-muted-foreground">
            {state.businessSetupCompletedAt
              ? t("completedAt", { date: new Date(state.businessSetupCompletedAt).toLocaleDateString() })
              : t("progress.percent", { percent: progress.percent })}
          </p>
        </CardContent>
      </Card>

      <SetupNextActionCard nextAction={state.nextAction} />

      {state.readiness && <SetupReadinessPanel readiness={state.readiness} />}

      {SETUP_GROUPS.map((group) => (
        <section key={group.key} className="space-y-3">
          <h2 className="text-lg font-semibold">{t(`groups.${group.key}`)}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.tasks.map((type) => {
              const task = taskByType.get(type)
              if (!task) return null
              return (
                <SetupTaskCard
                  key={type}
                  task={task}
                  taskByType={taskByType}
                  onExecute={executeTask.mutate}
                  onSkip={skipTask.mutate}
                  pendingType={pendingType}
                />
              )
            })}
          </div>
        </section>
      ))}

      <SetupReconciliationPanel
        task={taskByType.get("RECONCILIATION") ?? null}
        onRun={executeTask.mutate}
        isRunning={executeTask.isPending}
      />
    </div>
  )
}
