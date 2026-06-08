import type { UsersClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type UsersResourceContext = ResourceContext<UsersClient>

export function useUsersResource(): UsersResourceContext {
    return useResourceContext<UsersClient>()
}
