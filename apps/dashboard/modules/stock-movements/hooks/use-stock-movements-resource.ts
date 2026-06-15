import type { StockMovementsClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type StockMovementsResourceContext = ResourceContext<StockMovementsClient>

export function useStockMovementsResource(): StockMovementsResourceContext {
    return useResourceContext<StockMovementsClient>()
}
