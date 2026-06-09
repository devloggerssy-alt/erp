import type { InvoicesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type InvoicesResourceContext = ResourceContext<InvoicesClient>

export function useInvoicesResource(): InvoicesResourceContext {
    return useResourceContext<InvoicesClient>()
}
