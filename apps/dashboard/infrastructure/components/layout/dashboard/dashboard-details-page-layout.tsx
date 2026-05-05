"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { DashboardHeader } from "./dashboard-header"

type Tab = {
  /** URL path this tab navigates to */
  href: string
  label: string
}

type DashboardDetailsPageLayoutProps = {
  /** Primary title displayed in the header */
  title: string
  /** Secondary text below the title */
  description?: string
  /** Avatar image URL */
  avatarSrc?: string
  /** Fallback text for the avatar (e.g. initials) */
  avatarFallback?: string
  /** Icon element rendered instead of avatar when no avatar is provided */
  icon?: React.ReactNode
  /** Action buttons rendered on the right side of the header */
  actions?: React.ReactNode
  /** Optional back navigation URL */
  backHref?: string
  /** Content rendered between the header and tabs */
  subHeader?: React.ReactNode
  /** Route-based tab definitions */
  tabs?: Tab[]
  /** Content from the active route (Next.js children) */
  children?: React.ReactNode
  className?: string
}

export default function DashboardDetailsPageLayout({
  title,
  description,
  avatarSrc,
  avatarFallback,
  icon,
  actions,
  backHref,
  subHeader,
  tabs,
  children,
  className,
}: DashboardDetailsPageLayoutProps) {
  const pathname = usePathname()

  return (
    <div className={cn("flex flex-col h-full ")}>
        
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-6 bg-card">
        <div className="flex items-center gap-3">
          {backHref && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={backHref}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          )}
          {(avatarSrc || avatarFallback) && (
            <Avatar size="lg">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={title} />}
              <AvatarFallback>
                {avatarFallback ?? title.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          {!avatarSrc && !avatarFallback && icon && (
            <div className="flex items-center justify-center size-10 rounded-full bg-muted text-muted-foreground">
              {icon}
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-1">{actions}</div>
        )}
      </div>

      {/* Sub-header */}
      {subHeader && (
        <div className="border-b px-4 py-3 lg:px-6 bg-card">{subHeader}</div>
      )}

      {/* Navigation tabs */}
      {tabs && tabs.length > 0 && (
        <nav className="flex items-center gap-1 border-b px-4 lg:px-6 bg-card">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative inline-flex items-center justify-center px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  isActive && "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground"
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      )}

      {/* Route content */}
      <div className={cn("flex-1 p-4 lg:p-6", className)}>{children}</div>
    </div>
  )
}

export type { DashboardDetailsPageLayoutProps, Tab as DashboardDetailsTab }
