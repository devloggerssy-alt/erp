"use client"

import { ShieldAlert } from "lucide-react"
import { useTranslations } from "next-intl"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import { useBusinessSetup } from "../hooks/use-business-setup"
import { computeGroupProgress, computeSetupProgress, initialOpenGroup, SETUP_GROUPS } from "../setup.config"
import { SETUP_GROUP_ICONS } from "./setup-icons"
import { SetupOverview } from "./setup-overview"
import { SetupReadinessPanel } from "./setup-readiness-panel"
import { SetupReconciliationPanel } from "./setup-reconciliation-panel"
import { SetupTaskRow } from "./setup-task-row"

export function SetupHub() {
  const t = useTranslations("business.businessSetup")
  const { allowed, isLoading, state, executeTask, skipTask } = useBusinessSetup()

  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="size-6 text-muted-foreground" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("noAccess")}</p>
      </div>
    )
  }

  if (isLoading || !state) return <SetupHubSkeleton label={t("loading")} />

  const taskByType = new Map(state.tasks.map((task) => [task.type, task]))
  const progress = computeSetupProgress(state.tasks)
  const nextType = state.nextAction?.type ?? null
  const pendingType = executeTask.isPending
    ? executeTask.variables ?? null
    : skipTask.isPending
      ? skipTask.variables ?? null
      : null
  const openGroup = initialOpenGroup(taskByType, nextType)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <SetupOverview
        progress={progress}
        completedAt={state.businessSetupCompletedAt}
        nextAction={state.nextAction}
        onExecute={executeTask.mutate}
        pendingType={pendingType}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Accordion
          // Remount when the recommended step moves to another group so that group opens.
          key={openGroup ?? "done"}
          type="multiple"
          defaultValue={openGroup ? [openGroup] : []}
          className="overflow-hidden rounded-xl border bg-card"
        >
          {SETUP_GROUPS.map((group) => {
            const Icon = SETUP_GROUP_ICONS[group.key]
            const groupProgress = computeGroupProgress(group, taskByType)
            const isGroupDone = groupProgress.total > 0 && groupProgress.completed === groupProgress.total
            const percent = groupProgress.total === 0 ? 100 : (groupProgress.completed / groupProgress.total) * 100

            return (
              <AccordionItem key={group.key} value={group.key}>
                <AccordionTrigger className="items-center gap-3 rounded-none px-4 py-3.5 hover:bg-muted/40 hover:no-underline">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      isGroupDone ? "bg-primary/10 text-primary" : "bg-muted text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex-1 text-sm font-semibold">{t(`groups.${group.key}`)}</span>
                  <span className="hidden w-24 sm:block" aria-hidden>
                    <span className="block h-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
                    </span>
                  </span>
                  <span className="w-14 text-end text-xs font-medium text-muted-foreground tabular-nums">
                    {t("groupProgress", groupProgress)}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <ul className="divide-y border-t">
                    {group.tasks.map((type) => {
                      const task = taskByType.get(type)
                      if (!task) return null
                      return (
                        <SetupTaskRow
                          key={type}
                          task={task}
                          taskByType={taskByType}
                          onExecute={executeTask.mutate}
                          onSkip={skipTask.mutate}
                          pendingType={pendingType}
                          isNext={type === nextType}
                        />
                      )
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>

        <aside className="divide-y overflow-hidden rounded-xl border bg-card lg:sticky lg:top-6">
          {state.readiness && <SetupReadinessPanel readiness={state.readiness} />}
          <SetupReconciliationPanel
            task={taskByType.get("RECONCILIATION") ?? null}
            onRun={executeTask.mutate}
            isRunning={executeTask.isPending && executeTask.variables === "RECONCILIATION"}
          />
        </aside>
      </div>
    </div>
  )
}

/** Mirrors the loaded layout so nothing jumps when data arrives. */
function SetupHubSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true" aria-label={label}>
      <div className="flex items-center gap-5 rounded-xl border p-6">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="divide-y rounded-xl border">
          {SETUP_GROUPS.map((group) => (
            <div key={group.key} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="size-8" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
