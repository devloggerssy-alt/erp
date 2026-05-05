"use client"

import type { NavGroup, UserInfo } from "@/base/types/navigation"
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar"
import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { AppSidebar } from "./app-sidebar"
import { DashboardHeader } from "./dashboard-header"

type DashboardLayoutProps = {
  children: React.ReactNode
  /** Navigation groups rendered in the sidebar */
  navGroups: NavGroup[]
  /** Logo element displayed at the top of the sidebar */
  logo?: React.ReactNode
  /** Current user info shown in the header */
  user?: UserInfo
  /** Custom actions rendered in the header (e.g. session timer, clock-in button) */
  headerActions?: React.ReactNode
  /** Default sidebar open state */
  defaultOpen?: boolean
}

export function DashboardLayout({
  children,
  navGroups,
  logo,
  user,
  headerActions,
  defaultOpen = true,
}: DashboardLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar navGroups={navGroups} logo={logo} />
        <SidebarInset>
          <div>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
