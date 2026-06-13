import { generateResource } from "@/shared/data-view/resource"
import type { ICrudClient } from "@devloggers/api-client"

export const BrandsResource = generateResource<ICrudClient>({
    getClient: (api) => api.brands as ICrudClient,
    paramKey: "brands",
    list: {
        searchIn: ["name"],
        defaultSort: { field: "name", order: "asc" },
    },
})
