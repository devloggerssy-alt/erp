"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import type { ReadinessModuleKey, SetupReadiness } from "@/shared/hooks/use-setup-readiness"

export function SetupReadinessPanel({ readiness }: { readiness: SetupReadiness }) {
  const t = useTranslations("business.businessSetup")
  const moduleKeys = Object.keys(readiness.modules) as ReadinessModuleKey[]

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("readiness.title")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {moduleKeys.map((moduleKey) => {
          const module = readiness.modules[moduleKey]
          return (
            <Card key={moduleKey}>
              <CardContent className="space-y-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{t(`readiness.modules.${moduleKey}`)}</span>
                  <Badge variant={module.ready ? "default" : "outline"}>
                    {module.ready ? t("readiness.ready") : t("readiness.notReady")}
                  </Badge>
                </div>
                {!module.ready && module.blockers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {module.blockers.map((blocker) => t(`tasks.${blocker}`)).join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
