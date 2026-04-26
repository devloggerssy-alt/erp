import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const PARTS_ROUTES = {
    INDEX: "/api/parts",
    BY_ID: "/api/parts/{id}",
    IMPORT: "/api/import-parts",
    EXPORT: "/api/export-parts",
    TOGGLE_STATUS: "/api/toggle-part-status",
} as const satisfies Record<string, ApiPath>

export class PartsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(PARTS_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof PARTS_ROUTES.INDEX, "post">) {
        return this.post(PARTS_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof PARTS_ROUTES.BY_ID, "put">) {
        return this.put(PARTS_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(PARTS_ROUTES.BY_ID, { params: { id } })
    }

    async import(payload: ApiRequestBody<typeof PARTS_ROUTES.IMPORT, "post">) {
        return this.post(PARTS_ROUTES.IMPORT, payload)
    }

    async export(payload: ApiRequestBody<typeof PARTS_ROUTES.EXPORT, "post">) {
        return this.post(PARTS_ROUTES.EXPORT, payload)
    }

    async toggleStatus(payload: ApiRequestBody<typeof PARTS_ROUTES.TOGGLE_STATUS, "post">) {
        return this.post(PARTS_ROUTES.TOGGLE_STATUS, payload)
    }
}
