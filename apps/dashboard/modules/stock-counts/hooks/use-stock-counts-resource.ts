import type { StockCountsClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type StockCountsResourceContext = ResourceContext<StockCountsClient>

export function useStockCountsResource(): StockCountsResourceContext {
    return useResourceContext<StockCountsClient>()
}
