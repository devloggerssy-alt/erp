"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"

type NavItem = { href: string; labelKey: string }

const SECTIONS: { groupKey: string; items: NavItem[] }[] = [
  {
    groupKey: "company",
    items: [{ href: "/settings/company", labelKey: "profile.navLabel" }],
  },
  {
    groupKey: "preferences",
    items: [
      { href: "/settings/localization", labelKey: "localization.navLabel" },
      { href: "/settings/financial", labelKey: "financial.navLabel" },
      { href: "/settings/gl-accounts", labelKey: "glAccounts.navLabel" },
      { href: "/settings/documents", labelKey: "documents.navLabel" },
    ],
  },
  {
    groupKey: "systemData",
    items: [
      { href: "/settings/currencies", labelKey: "currencies.navLabel" },
      { href: "/settings/fiscal-periods", labelKey: "fiscalPeriods.navLabel" },
      { href: "/settings/document-sequences", labelKey: "documentSequences.navLabel" },
    ],
  },
]

export function SettingsNav() {
  const t = useTranslations("business.settings")
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-4">
      {SECTIONS.map((group) => (
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
