import type { RolesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type RolesResourceContext = ResourceContext<RolesClient>

export function useRolesResource(): RolesResourceContext {
    return useResourceContext<RolesClient>()
}
