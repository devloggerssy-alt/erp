import type { StockBalancesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type StockBalancesResourceContext = ResourceContext<StockBalancesClient>

export function useStockBalancesResource(): StockBalancesResourceContext {
    return useResourceContext<StockBalancesClient>()
}
