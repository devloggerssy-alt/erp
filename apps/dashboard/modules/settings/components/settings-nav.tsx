"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { type PermissionKey } from "@devloggers/api-contracts"
import { usePermissions } from "@/shared/hooks/use-permissions"
import { cn } from "@/shared/lib/utils"

type SettingsNavItem = { href: string; labelKey: string; permission: PermissionKey }

const SECTIONS: { groupKey: string; items: SettingsNavItem[] }[] = [
  {
    groupKey: "company",
    items: [{ href: "/settings/company", labelKey: "profile.navLabel", permission: "settings.manage" }],
  },
  {
    groupKey: "preferences",
    items: [
      { href: "/settings/localization", labelKey: "localization.navLabel", permission: "settings.manage" },
      { href: "/settings/financial", labelKey: "financial.navLabel", permission: "financialSettings.manage" },
      { href: "/settings/gl-accounts", labelKey: "glAccounts.navLabel", permission: "accounts.view" },
      { href: "/settings/documents", labelKey: "documents.navLabel", permission: "settings.manage" },
    ],
  },
  {
    groupKey: "systemData",
    items: [
      { href: "/settings/currencies", labelKey: "currencies.navLabel", permission: "currencies.view" },
      { href: "/settings/fiscal-periods", labelKey: "fiscalPeriods.navLabel", permission: "fiscalPeriods.view" },
      { href: "/settings/document-sequences", labelKey: "documentSequences.navLabel", permission: "documentSequences.view" },
    ],
  },
  {
    groupKey: "danger",
    items: [{ href: "/settings/danger", labelKey: "danger.navLabel", permission: "danger.reset" }],
  },
]

export function SettingsNav() {
  const t = useTranslations("business.settings")
  const pathname = usePathname()
  const { can } = usePermissions()

  const sections = SECTIONS.map((section) => ({
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
            const active = pathname.endsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors",
                  active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
                )}
              >
                {t(item.labelKey)}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
