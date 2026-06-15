import { generateResource } from "@/shared/data-view/resource"
import type { StockMovementsClient } from "@devloggers/api-client"

export const StockMovementsResource = generateResource<StockMovementsClient>({
    getClient: (api) => api["stock-ledger"] as StockMovementsClient,
    paramKey: "stock-movements",
    list: {
        searchIn: ["itemName", "itemCode", "warehouseName"],
        defaultSort: { field: "createdAt", order: "desc" },
    },
})
