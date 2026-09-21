"use client"

import { useQuery } from "@tanstack/react-query"
import type { BusinessSetupClient } from "@devloggers/api-client"
import { useApi } from "@/shared/useApi"
import { usePermissions } from "@/shared/hooks/use-permissions"

export type BusinessSetupState = Awaited<ReturnType<BusinessSetupClient["getState"]>>
export type SetupReadiness = NonNullable<BusinessSetupState["readiness"]>
export type ReadinessModuleKey = keyof SetupReadiness["modules"]

export const businessSetupStateKey = ["business-setup", "state"] as const

/**
 * Readiness is exposed through the business-setup state endpoint, which requires
 * `businessSetup.manage` — the soft warnings therefore render for setup managers
 * only (the people the hub is for). The API remains the enforcement point.
 */
export function useSetupReadiness() {
  const api = useApi()
  const { can } = usePermissions()
  const allowed = can("businessSetup.manage")

  const query = useQuery({
    queryKey: businessSetupStateKey,
    queryFn: () => api["business-setup"].getState(),
    enabled: allowed,
  })

  return { allowed, isLoading: query.isLoading, state: query.data ?? null }
}
