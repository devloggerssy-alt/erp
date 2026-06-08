import type { PartiesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type SuppliersResourceContext = ResourceContext<PartiesClient>

export function useSuppliersResource(): SuppliersResourceContext {
    return useResourceContext<PartiesClient>()
}
