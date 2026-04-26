import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const TAX_ROUTES = {
    INDEX: "/api/taxes",
    BY_ID: "/api/taxes/{id}",
    SET_DEFAULT: "/api/set-default-tax",
    REMOVE_DEFAULT: "/api/remove-default-tax",
} as const satisfies Record<string, ApiPath>

export class TaxesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(TAX_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof TAX_ROUTES.INDEX, "post">) {
        return this.post(TAX_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof TAX_ROUTES.BY_ID, "put">) {
        return this.put(TAX_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(TAX_ROUTES.BY_ID, { params: { id } })
    }

    async setDefault(payload: ApiRequestBody<typeof TAX_ROUTES.SET_DEFAULT, "post">) {
        return this.post(TAX_ROUTES.SET_DEFAULT, payload)
    }

    async removeDefault(payload: ApiRequestBody<typeof TAX_ROUTES.REMOVE_DEFAULT, "post">) {
        return this.post(TAX_ROUTES.REMOVE_DEFAULT, payload)
    }
}
