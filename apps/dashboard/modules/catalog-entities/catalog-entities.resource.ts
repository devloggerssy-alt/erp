import { generateResource } from "@/shared/data-view/resource"
import type { CatalogEntitiesClient } from "@devloggers/api-client"

export const CatalogEntitiesResource = generateResource<CatalogEntitiesClient>({
    getClient: (api) => api["catalog-entities"],
    paramKey: "catalog-entities",
    list: {
        searchIn: ["name", "kind"],
        defaultSort: { field: "name", order: "asc" },
    },
})
