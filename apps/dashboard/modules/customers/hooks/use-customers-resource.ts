import type { PartiesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type CustomersResourceContext = ResourceContext<PartiesClient>

export function useCustomersResource(): CustomersResourceContext {
    return useResourceContext<PartiesClient>()
}
