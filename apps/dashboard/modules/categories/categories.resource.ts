import { generateResource } from "@/shared/data-view/resource"
import { type CategoriesClient } from "@devloggers/api-client"

export const CategoriesResource = generateResource<CategoriesClient>({
    getClient: (api) => api['item-categories'],
    paramKey: "categories",
    list: {
        searchIn: ["name"],
        defaultSort: { field: "name", order: "asc" },
    },
})
