import { ReactNode } from "react"
import type { ApiComponents, PermissionKey } from "@devloggers/api-contracts"

/** Module keys of the tenant's cached operational readiness (Phase 10.4.2). */
export type ReadinessModuleKey = keyof ApiComponents["schemas"]["OperationalReadinessModulesDto"]

export type NavItem = {
  titleKey: string
  href: string
  icon?: ReactNode
  isActive?: boolean
  badge?: string | number
  /** Cosmetic gate; the API enforces for real. Item is hidden when not granted. */
  permission?: PermissionKey
  /** Shows a soft warning icon while the module is not operationally ready. */
  readinessModule?: ReadinessModuleKey
  items?: NavSubItem[]
}

export type NavSubItem = {
  titleKey: string
  href: string
  icon?: ReactNode
  isActive?: boolean
  permission?: PermissionKey
  readinessModule?: ReadinessModuleKey
}

export type NavGroup = {
  labelKey?: string
  items: NavItem[]
}

export type UserInfo = {
  name: string
  email?: string
  avatar?: string
  initials?: string
  role?: string
}
