import type { UnitsClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type UnitsResourceContext = ResourceContext<UnitsClient>

export function useUnitsResource(): UnitsResourceContext {
    return useResourceContext<UnitsClient>()
}