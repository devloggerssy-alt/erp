import { generateResource } from "@/shared/data-view/resource"
import type { BrandsClient } from "@devloggers/api-client"

export const BrandsResource = generateResource<BrandsClient>({
    getClient: (api) => api.brands,
    paramKey: "brands",
    list: {
        searchIn: ["name"],
        defaultSort: { field: "name", order: "asc" },
    },
})
