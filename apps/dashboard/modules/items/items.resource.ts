import { generateResource } from "@/shared/data-view/resource"
import { type ItemsClient } from "@devloggers/api-client"

export const ItemsResource = generateResource<ItemsClient>({
    getClient: (api) => api.items,
    paramKey: "items",
    list: {
        searchIn: ["name", "code", "barcode"],
        defaultSort: { field: "name", order: "asc" },
    },
})
