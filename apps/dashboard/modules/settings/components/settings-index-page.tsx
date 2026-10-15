"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { usePermissions } from "@/shared/hooks/use-permissions"
import { SETTINGS_NAV_GROUPS } from "../settings-navigation"

export function SettingsIndexPage() {
  const t = useTranslations("business.settings")
  const { can } = usePermissions()

  const sections = SETTINGS_NAV_GROUPS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.permission)),
  })).filter((section) => section.items.length > 0)

  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("index.empty")}</p>
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{t("index.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("index.description")}</p>
      </div>
      {sections.map((group) => (
        <section key={group.groupKey} className="flex flex-col gap-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase">
            {t(`groups.${group.groupKey}`)}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="text-sm font-medium">{t(item.labelKey)}</span>
                      <ChevronRight className="ms-auto size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
