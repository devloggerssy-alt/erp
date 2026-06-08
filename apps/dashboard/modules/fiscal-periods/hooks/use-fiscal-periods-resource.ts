import type { FiscalPeriodsClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type FiscalPeriodsResourceContext = ResourceContext<FiscalPeriodsClient>

export function useFiscalPeriodsResource(): FiscalPeriodsResourceContext {
    return useResourceContext<FiscalPeriodsClient>()
}
