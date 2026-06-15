import { generateResource } from "@/shared/data-view/resource"
import type { StockBalancesClient } from "@devloggers/api-client"

export const StockBalancesResource = generateResource<StockBalancesClient>({
    getClient: (api) => api["inventory"] as StockBalancesClient,
    paramKey: "stock-balances",
    list: {
        searchIn: ["itemName", "itemCode", "warehouseName"],
        defaultSort: { field: "itemName", order: "asc" },
    },
})
