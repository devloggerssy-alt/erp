"use client"

import { CircleCheck, CircleDashed } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReadinessModuleKey, SetupReadiness } from "@/shared/hooks/use-setup-readiness"

export function SetupReadinessPanel({ readiness }: { readiness: SetupReadiness }) {
  const t = useTranslations("business.businessSetup")
  const moduleKeys = Object.keys(readiness.modules) as ReadinessModuleKey[]
  const readyCount = moduleKeys.filter((moduleKey) => readiness.modules[moduleKey].ready).length

  return (
    <section className="space-y-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("readiness.title")}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("readinessSummary", { ready: readyCount, total: moduleKeys.length })}
        </span>
      </div>
      <ul className="space-y-2.5">
        {moduleKeys.map((moduleKey) => {
          const moduleState = readiness.modules[moduleKey]
          return (
            <li key={moduleKey} className="flex items-start gap-2.5">
              {moduleState.ready ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-label={t("readiness.ready")} />
              ) : (
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={t("readiness.notReady")} />
              )}
              <div className="min-w-0">
                <p className="text-sm">{t(`readiness.modules.${moduleKey}`)}</p>
                {!moduleState.ready && moduleState.blockers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("readinessNeeds", { tasks: moduleState.blockers.map((blocker) => t(`tasks.${blocker}`)).join(", ") })}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
