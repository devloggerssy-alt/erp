"use client"

import { AlertTriangle, BookOpenCheck, CircleCheck, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import type { SetupTask, SetupTaskType } from "../hooks/use-business-setup"
import { parseReconciliationChecks } from "../setup.config"

type Props = {
  task: SetupTask | null
  onRun: (type: SetupTaskType) => void
  isRunning: boolean
}

/**
 * Phase 10.4.3 + 10.5: names every failing reconciliation check in plain language.
 * These are the real legacy-data blockers (e.g. journal lines missing amounts or
 * rates) — the remediation surface the roadmap calls for.
 */
export function SetupReconciliationPanel({ task, onRun, isRunning }: Props) {
  const t = useTranslations("business.businessSetup")
  if (!task) return null

  const failedChecks = parseReconciliationChecks(task.progress).filter((check) => !check.passed)
  const isCompleted = task.status === "COMPLETED"

  return (
    <section className="space-y-3 p-4">
      <h2 className="text-sm font-semibold">{t("reconciliation.title")}</h2>

      {isCompleted ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden />
          {t("reconciliation.passed")}
        </p>
      ) : failedChecks.length > 0 ? (
        <div className="space-y-2.5">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {t("reconciliation.failed", { count: failedChecks.length })}
          </p>
          <ul className="space-y-2 rounded-lg bg-destructive/5 p-3">
            {failedChecks.map((check) => (
              <li key={check.code} className="text-xs leading-relaxed">
                {t(`checks.${check.code}`)}{" "}
                <span className="font-medium text-destructive tabular-nums">
                  {t("reconciliation.findings", { count: check.findingCount })}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("legacy.description")}</p>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpenCheck className="size-4 shrink-0" aria-hidden />
          {t("reconciliation.neverRun")}
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={task.status !== "READY" || isRunning}
        onClick={() => onRun("RECONCILIATION")}
      >
        <RefreshCw className={isRunning ? "size-3.5 animate-spin motion-reduce:animate-none" : "size-3.5"} aria-hidden />
        {isRunning ? t("reconciliation.running") : t("reconciliation.run")}
      </Button>
    </section>
  )
}
