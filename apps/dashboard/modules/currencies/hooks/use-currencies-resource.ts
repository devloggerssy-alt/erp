import type { CurrenciesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type CurrenciesResourceContext = ResourceContext<CurrenciesClient>

export function useCurrenciesResource(): CurrenciesResourceContext {
    return useResourceContext<CurrenciesClient>()
}
