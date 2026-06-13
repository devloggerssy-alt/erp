import type { ICrudClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type CatalogEntitiesResourceContext = ResourceContext<ICrudClient>

export function useCatalogEntitiesResource(): CatalogEntitiesResourceContext {
    return useResourceContext<ICrudClient>()
}
