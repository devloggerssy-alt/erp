"use client"

import { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export type ResourceLayoutProps = {
  /** Page title */
  title?: string
  /** Optional page description */
  description?: string
  /** Optional header actions */
  headerActions?: ReactNode
  /** Main content area */
  children: ReactNode
  /** Page padding */
  padding?: "none" | "sm" | "md" | "lg"
  /** Full screen mode */
  fullscreen?: boolean
  /** Custom className for main container */
  className?: string
}

export function ResourceLayout({
  title,
  description,
  headerActions,
  children,
  padding = "md",
  fullscreen = false,
  className,
}: ResourceLayoutProps) {
  const paddingClass = {
    none: "",
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
  }[padding]

  return (
    <div className={cn("page", fullscreen && "h-screen", className)}>
      <main
        className={cn(
          "w-full h-full flex flex-col",
          paddingClass,
          fullscreen && "p-0 lg:p-0"
        )}
      >
        {/* Header Section: Title + Description + Actions */}
        {(title || description || headerActions) && (
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              )}
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {headerActions && (
              <div className="shrink-0">{headerActions}</div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  )
}