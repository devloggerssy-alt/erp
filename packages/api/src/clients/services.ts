import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const SERVICE_ROUTES = {
    INDEX: "/api/services",
    BY_ID: "/api/services/{id}",
    IMPORT: "/api/import-services",
    EXPORT: "/api/export-services",
} as const satisfies Record<string, ApiPath>

export class ServicesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(SERVICE_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof SERVICE_ROUTES.INDEX, "post">) {
        return this.post(SERVICE_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof SERVICE_ROUTES.BY_ID, "put">) {
        return this.put(SERVICE_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(SERVICE_ROUTES.BY_ID, { params: { id } })
    }

    async import(payload: ApiRequestBody<typeof SERVICE_ROUTES.IMPORT, "post">) {
        return this.post(SERVICE_ROUTES.IMPORT, payload)
    }

    async export(payload: ApiRequestBody<typeof SERVICE_ROUTES.EXPORT, "post">) {
        return this.post(SERVICE_ROUTES.EXPORT, payload)
    }
}
