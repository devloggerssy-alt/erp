import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const LABEL_ROUTES = {
    INDEX: "/api/labels",
    BY_ID: "/api/labels/{id}",
} as const satisfies Record<string, ApiPath>

export class LabelsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(LABEL_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof LABEL_ROUTES.INDEX, "post">) {
        return this.post(LABEL_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof LABEL_ROUTES.BY_ID, "put">) {
        return this.put(LABEL_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(LABEL_ROUTES.BY_ID, { params: { id } })
    }
}
