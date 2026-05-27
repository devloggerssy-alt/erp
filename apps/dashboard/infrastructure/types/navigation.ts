import { ReactNode } from "react"

 
export type NavItem = {
  titleKey: string
  href: string
  icon?: ReactNode
  isActive?: boolean
  badge?: string | number
  items?: NavSubItem[]
}

export type NavSubItem = {
  titleKey: string
  href: string
  icon?: ReactNode
  isActive?: boolean
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
