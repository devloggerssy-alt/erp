import type { WarehousesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type WarehousesResourceContext = ResourceContext<WarehousesClient>

export function useWarehousesResource(): WarehousesResourceContext {
    return useResourceContext<WarehousesClient>()
}
