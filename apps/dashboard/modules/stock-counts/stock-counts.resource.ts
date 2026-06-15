import { generateResource } from "@/shared/data-view/resource"
import type { StockCountsClient } from "@devloggers/api-client"

export const StockCountsResource = generateResource<StockCountsClient>({
    getClient: (api) => api["stock-counts"] as StockCountsClient,
    paramKey: "stock-counts",
    list: {
        defaultSort: { field: "createdAt", order: "desc" },
    },
})
