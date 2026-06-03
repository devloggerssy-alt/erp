"use client"

import { ReactNode } from "react"
import type { ICrudClient } from "@devloggers/api-client"
import { useLocale } from "next-intl"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { SlidersHorizontalIcon, SearchIcon, DownloadIcon } from "lucide-react"
import { useResourceContext } from "./resource-context"
import type { ResourceRender } from "./types"

type ReactNodeOrRender<TClient extends ICrudClient> = ReactNode | ResourceRender<TClient>

export type ResourceListPageProps<TClient extends ICrudClient = any> = {
  /** Main content area (table, grid, etc.) */
  children: ReactNode
  /** Search bar placeholder text */
  searchPlaceholder?: string
  /** Search input value handler */
  onSearchChange?: (value: string) => void
  /** Show search bar */
  showSearch?: boolean
  /** Show filters toggle button */
  showFilters?: boolean
  /** Filters button click handler */
  onFiltersClick?: () => void
  /** Show export button */
  showExport?: boolean
  /** Export button click handler */
  onExport?: () => void
  /** Custom toolbar actions (create button, print, etc.) - supports function for resource context */
  toolbar?: ReactNodeOrRender<TClient>
  /** Custom actions slot - supports function for resource context */
  actions?: ReactNodeOrRender<TClient>
}

export function ResourceListPage<TClient extends ICrudClient = any>({
  children,
  searchPlaceholder = "Search...",
  onSearchChange,
  showSearch = true,
  showFilters = true,
  onFiltersClick,
  showExport = false,
  onExport,
  toolbar,
  actions,
}: ResourceListPageProps<TClient>) {
  const locale = useLocale()
  const isRtl = locale === "ar"

  let resource
  try {
    resource = useResourceContext<TClient>()
  } catch {
    resource = undefined
  }

  const resolveNodeOrRender = (
    value: ReactNodeOrRender<TClient> | null | undefined
  ): ReactNode => {
    if (!value) return null
    if (typeof value === "function" && resource) {
      return value(resource) as ReactNode
    }
    return value as ReactNode
  }

  const resolvedToolbar = resolveNodeOrRender(toolbar)
  const resolvedActions = resolveNodeOrRender(actions)

  const hasLegacyOperations =
    !resolvedToolbar && (showSearch || showFilters || showExport || resolvedActions)

  return (
    <>
      {resolvedToolbar}

      {hasLegacyOperations && (
        <div
          className={cn(
            "mb-6 flex flex-col gap-4",
            "md:flex-row md:items-center md:justify-between"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              isRtl ? "flex-row-reverse" : "flex-row"
            )}
          >
            {showSearch && (
              <div className="relative flex-1 md:flex-none md:w-64">
                <SearchIcon
                  className={cn(
                    "absolute size-4 text-muted-foreground pointer-events-none",
                    isRtl ? "right-3" : "left-3"
                  )}
                />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className={cn("h-9", isRtl ? "pr-10" : "pl-10")}
                />
              </div>
            )}

            {showFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onFiltersClick}
                className="h-9"
              >
                <SlidersHorizontalIcon
                  className={cn("size-4", showSearch && "me-2")}
                />
                {showSearch && "Filters"}
              </Button>
            )}
          </div>

          <div
            className={cn(
              "flex items-center gap-2",
              isRtl ? "flex-row-reverse" : "flex-row"
            )}
          >
            {showExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="h-9"
              >
                <DownloadIcon className="size-4 me-2" />
                Export
              </Button>
            )}

            {resolvedActions && (
              <div className="flex items-center gap-2">{resolvedActions}</div>
            )}
          </div>
        </div>
      )}

      {!hasLegacyOperations && resolvedActions && (
        <div
          className={cn(
            "mb-4 flex items-center justify-end gap-2",
            isRtl ? "flex-row-reverse" : "flex-row"
          )}
        >
          {resolvedActions}
        </div>
      )}

      <div className="flex-1 overflow-auto">{children}</div>
    </>
  )
}
