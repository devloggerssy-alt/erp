"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
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
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("reconciliation.title")}</h2>
      <Card>
        <CardContent className="space-y-3 p-4">
          {isCompleted ? (
            <p className="text-sm text-muted-foreground">{t("reconciliation.passed")}</p>
          ) : failedChecks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                {t("reconciliation.failed", { count: failedChecks.length })}
              </p>
              <ul className="list-disc space-y-1 ps-5 text-sm">
                {failedChecks.map((check) => (
                  <li key={check.code}>
                    {t(`checks.${check.code}`)}{" "}
                    <span className="text-muted-foreground">
                      ({t("reconciliation.findings", { count: check.findingCount })})
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{t("legacy.description")}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("reconciliation.neverRun")}</p>
          )}

          <Button
            size="sm"
            disabled={task.status !== "READY" || isRunning}
            onClick={() => onRun("RECONCILIATION")}
          >
            {isRunning ? t("reconciliation.running") : t("reconciliation.run")}
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
