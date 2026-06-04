import type { ICrudClient } from "@devloggers/api-client"
import type { createApi } from "@devloggers/api-client"

type ApiInstance = ReturnType<typeof createApi>

const RESOURCE_CLIENT_RESOLVERS: Record<string, (api: ApiInstance) => ICrudClient> = {
    units: (api) => api.units,
    "item-categories": (api) => api["item-categories"],
    warehouses: (api) => api.warehouses,
}

export function resolveResourceClient(
    api: ApiInstance,
    resourceKey: string,
): ICrudClient | null {
    const resolver = RESOURCE_CLIENT_RESOLVERS[resourceKey]
    return resolver ? resolver(api) : null
}

export function getResourceLabel(item: { name?: string; id?: string }): string {
    return item.name ?? String(item.id ?? "")
}
