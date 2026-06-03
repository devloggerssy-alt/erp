import { generateResource } from "@/shared/data-view/resource"
import { type WarehousesClient } from "@devloggers/api-client"

export const WarehousesResource = generateResource<WarehousesClient>({
    getClient: (api) => api.warehouses,
    paramKey: "warehouses",
    list: {
        searchIn: ["code", "name", "address"],
        defaultSort: { field: "name", order: "asc" },
    },
})
