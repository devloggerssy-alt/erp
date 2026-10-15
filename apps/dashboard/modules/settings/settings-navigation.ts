import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Building2,
  Calendar,
  Coins,
  Hash,
  Languages,
  ReceiptText,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  UserCog,
} from "lucide-react"
import type { PermissionKey } from "@devloggers/api-contracts"

export type SettingsNavItemDef = {
  href: string
  /** Relative to `business.settings`, e.g. `"profile.navLabel"`. */
  labelKey: string
  /** Cosmetic gate; the API enforces for real. Item is hidden when not granted. */
  permission: PermissionKey
  /** Component reference (not JSX) so every consumer renders it the same way. */
  icon: LucideIcon
}

export type SettingsNavGroupDef = {
  /** Relative to `business.settings.groups`. */
  groupKey: string
  items: SettingsNavItemDef[]
}

/**
 * Single source of truth for settings navigation.
 * Consumed by the settings sidebar (`SettingsNav`), the global nav
 * (`config/navGroups.tsx`), and the `/settings` index page — so a page
 * can never exist in one place but be missing from another.
 */
export const SETTINGS_NAV_GROUPS: SettingsNavGroupDef[] = [
  {
    groupKey: "company",
    items: [
      { href: "/settings/company", labelKey: "profile.navLabel", permission: "settings.manage", icon: Building2 },
    ],
  },
  {
    groupKey: "preferences",
    items: [
      { href: "/settings/localization", labelKey: "localization.navLabel", permission: "settings.manage", icon: Languages },
      { href: "/settings/financial", labelKey: "financial.navLabel", permission: "financialSettings.manage", icon: Scale },
      { href: "/settings/defaults", labelKey: "defaults.navLabel", permission: "settings.manage", icon: SlidersHorizontal },
      { href: "/settings/gl-accounts", labelKey: "glAccounts.navLabel", permission: "accounts.view", icon: BookOpen },
      { href: "/settings/documents", labelKey: "documents.navLabel", permission: "settings.manage", icon: ReceiptText },
    ],
  },
  {
    groupKey: "access",
    items: [
      { href: "/settings/users", labelKey: "users.navLabel", permission: "users.view", icon: UserCog },
      { href: "/settings/roles", labelKey: "roles.navLabel", permission: "roles.view", icon: ShieldCheck },
    ],
  },
  {
    groupKey: "systemData",
    items: [
      { href: "/settings/currencies", labelKey: "currencies.navLabel", permission: "currencies.view", icon: Coins },
      { href: "/settings/fiscal-periods", labelKey: "fiscalPeriods.navLabel", permission: "fiscalPeriods.view", icon: Calendar },
      { href: "/settings/document-sequences", labelKey: "documentSequences.navLabel", permission: "documentSequences.view", icon: Hash },
    ],
  },
  {
    groupKey: "danger",
    items: [
      { href: "/settings/danger", labelKey: "danger.navLabel", permission: "danger.reset", icon: TriangleAlert },
    ],
  },
]

export const SETTINGS_NAV_ITEMS: SettingsNavItemDef[] = SETTINGS_NAV_GROUPS.flatMap(
  (group) => group.items,
)
