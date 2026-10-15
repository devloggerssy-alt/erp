"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { usePermissions } from "@/shared/hooks/use-permissions"
import { cn } from "@/shared/lib/utils"
import { SETTINGS_NAV_GROUPS } from "../settings-navigation"

export function SettingsNav() {
  const t = useTranslations("business.settings")
  const pathname = usePathname()
  const { can } = usePermissions()

  const sections = SETTINGS_NAV_GROUPS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.permission)),
  })).filter((section) => section.items.length > 0)

  return (
    <nav className="flex flex-col gap-4">
      {sections.map((group) => (
        <div key={group.groupKey} className="flex flex-col gap-1">
          <span className="px-2 text-xs font-medium text-muted-foreground uppercase">
            {t(`groups.${group.groupKey}`)}
          </span>
          {group.items.map((item) => {
            const Icon = item.icon
            const active = pathname.endsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
