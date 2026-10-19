import type { BranchesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type BranchesResourceContext = ResourceContext<BranchesClient>

export function useBranchesResource(): BranchesResourceContext {
    return useResourceContext<BranchesClient>()
}
