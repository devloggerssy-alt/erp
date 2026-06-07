import { generateResource } from "@/shared/data-view/resource"
import { type CategoriesClient } from "@devloggers/api-client"
import { itemCategoryResource } from "@devloggers/api-contracts"

export const CategoriesResource = generateResource<CategoriesClient>({
    getClient: (api) => api[itemCategoryResource.key],
    paramKey: "categories",
    list: {
        searchIn: ["name"],
        defaultSort: { field: "name", order: "asc" },
    },
})
