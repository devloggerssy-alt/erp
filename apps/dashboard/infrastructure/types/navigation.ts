import { ReactNode } from "react"
import type { PermissionKey } from "@devloggers/api-contracts"

export type NavItem = {
  titleKey: string
  href: string
  icon?: ReactNode
  isActive?: boolean
  badge?: string | number
  /** Cosmetic gate; the API enforces for real. Item is hidden when not granted. */
  permission?: PermissionKey
  items?: NavSubItem[]
}

export type NavSubItem = {
  titleKey: string
  href: string
  icon?: ReactNode
  isActive?: boolean
  permission?: PermissionKey
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
