import { CrudClient } from "../infra/crud-client"
import type { ApiClientOptions } from "../infra/client"
import type { ApiPath } from "../infra/types"

export const SERVICE_GROUP_ROUTES = {
    INDEX: "/api/service-groups",
    BY_ID: "/api/service-groups/{id}",
} as const satisfies Record<string, ApiPath>

export class ServiceGroupsClient extends CrudClient<
    typeof SERVICE_GROUP_ROUTES.INDEX,
    typeof SERVICE_GROUP_ROUTES.BY_ID
> {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions, SERVICE_GROUP_ROUTES.INDEX, SERVICE_GROUP_ROUTES.BY_ID)
    }
}
