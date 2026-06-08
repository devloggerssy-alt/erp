import type { AccountsClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type AccountsResourceContext = ResourceContext<AccountsClient>

export function useAccountsResource(): AccountsResourceContext {
    return useResourceContext<AccountsClient>()
}
