import { generateResource } from "@/shared/data-view/resource"
import type { ICrudClient } from "@devloggers/api-client"

export const CatalogEntitiesResource = generateResource<ICrudClient>({
    getClient: (api) => api["catalog-entities"] as ICrudClient,
    paramKey: "catalog-entities",
    list: {
        searchIn: ["name", "kind"],
        defaultSort: { field: "name", order: "asc" },
    },
})
