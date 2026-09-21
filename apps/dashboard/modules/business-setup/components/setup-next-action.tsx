"use client"

import { useTranslations } from "next-intl"
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import type { SetupNextAction } from "../hooks/use-business-setup"

export function SetupNextActionCard({ nextAction }: { nextAction: SetupNextAction | null }) {
  const t = useTranslations("business.businessSetup")
  if (!nextAction) return null

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-base">{t("nextAction.title")}</CardTitle>
        <CardDescription>
          {nextAction.reason === "READY"
            ? t("nextAction.ready", { task: t(`tasks.${nextAction.type}`) })
            : t("nextAction.waitingOn", {
                task: t(`tasks.${nextAction.type}`),
                blockers: nextAction.blockedBy.map((type) => t(`tasks.${type}`)).join(", "),
              })}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
