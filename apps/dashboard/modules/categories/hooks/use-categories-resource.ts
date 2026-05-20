import type { CategoriesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type CategoriesResourceContext = ResourceContext<CategoriesClient>

export function useCategoriesResource(): CategoriesResourceContext {
    return useResourceContext<CategoriesClient>()
}