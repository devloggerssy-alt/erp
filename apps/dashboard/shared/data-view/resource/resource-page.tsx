"use client"

import type { ReactNode } from "react"
import type { ICrudClient } from "@devloggers/api-client"
import { ResourceLayout } from "./resource-layout"
import { ResourceListPage, type ResourceListPageProps } from "./resource-list-page"
import type { ResourceRender } from "./types"
import { useResourceContext } from "./resource-context"

type ReactNodeOrRender<TClient extends ICrudClient> = ReactNode | ResourceRender<TClient>

export type ResourcePageProps<TClient extends ICrudClient = any> = ResourceListPageProps<TClient> & {
  /** Page title */
  title?: string
  /** Optional page description */
  description?: string
  /** Optional header actions */
  headerActions?: ReactNodeOrRender<TClient>
  /** Page padding */
  padding?: "none" | "sm" | "md" | "lg"
  /** Fullscreen mode */
  fullscreen?: boolean
}

export function ResourcePage<TClient extends ICrudClient = any>({
  title,
  description,
  headerActions: headerActionsProp,
  padding = "md",
  fullscreen = false,
  ...listPageProps
}: ResourcePageProps<TClient>) {
  // Try to get resource context (will fail gracefully if not in ResourceProvider)
  let resource
  try {
    resource = useResourceContext<TClient>()
  } catch {
    resource = undefined
  }

  // Resolve function-based props
  const resolveNodeOrRender = (
    value: ReactNodeOrRender<TClient> | null | undefined
  ): ReactNode => {
    if (!value) return null
    if (typeof value === "function" && resource) {
      return value(resource) as ReactNode
    }
    return value as ReactNode
  }

  const headerActions = resolveNodeOrRender(headerActionsProp)

  return (
    <ResourceLayout
      title={title}
      description={description}
      headerActions={headerActions}
      padding={padding}
      fullscreen={fullscreen}
    >
      <ResourceListPage {...listPageProps} />
    </ResourceLayout>
  )
}
