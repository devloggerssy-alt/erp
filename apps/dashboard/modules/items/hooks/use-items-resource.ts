import type { ItemsClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type ItemsResourceContext = ResourceContext<ItemsClient>

export function useItemsResource(): ItemsResourceContext {
    return useResourceContext<ItemsClient>()
}
