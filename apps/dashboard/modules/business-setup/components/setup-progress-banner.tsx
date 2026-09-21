"use client"

import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { useBusinessSetup } from "../hooks/use-business-setup"
import { computeSetupProgress } from "../setup.config"

export function SetupProgressBanner() {
  const t = useTranslations("business.businessSetup")
  const pathname = usePathname()
  const { allowed, state } = useBusinessSetup()

  if (!allowed || !state || state.businessSetupCompletedAt || pathname === "/setup") return null

  const progress = computeSetupProgress(state.tasks)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-sm dark:bg-amber-950/30">
      <span>{t("banner.text", { percent: progress.percent })}</span>
      <Link className="font-medium underline underline-offset-2" href="/setup">
        {t("banner.cta")}
      </Link>
    </div>
  )
}
