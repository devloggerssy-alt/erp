"use client"

import type { NavGroup, UserInfo } from "@/infrastructure/types/navigation"
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
  /** Breadcrumbs to render in the header */
  breadcrumbs?: React.ReactNode
  /** Default sidebar open state */
  defaultOpen?: boolean
}

export function DashboardLayout({
  children,
  navGroups,
  logo,
  user,
  headerActions,
  breadcrumbs,
  defaultOpen = true,
}: DashboardLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar navGroups={navGroups} logo={logo} />
        <SidebarInset>
          <div>
            <DashboardHeader user={user} actions={headerActions} breadcrumbs={breadcrumbs} />
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
