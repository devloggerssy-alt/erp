import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const VENDOR_ROUTES = {
    INDEX: "/api/vendors",
    BY_ID: "/api/vendors/{id}",
    TOGGLE_STATUS: "/api/toggle-vendor-status",
    CREATE_ADDRESS: "/api/create-vendor-address",
    ADDRESS_BY_ID: "/api/vendor-address/{id}",
} as const satisfies Record<string, ApiPath>

export class VendorsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(VENDOR_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof VENDOR_ROUTES.INDEX, "post">) {
        return this.post(VENDOR_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof VENDOR_ROUTES.BY_ID, "put">) {
        return this.put(VENDOR_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(VENDOR_ROUTES.BY_ID, { params: { id } })
    }

    async toggleStatus(payload: ApiRequestBody<typeof VENDOR_ROUTES.TOGGLE_STATUS, "post">) {
        return this.post(VENDOR_ROUTES.TOGGLE_STATUS, payload)
    }

    async createAddress(payload: ApiRequestBody<typeof VENDOR_ROUTES.CREATE_ADDRESS, "post">) {
        return this.post(VENDOR_ROUTES.CREATE_ADDRESS, payload)
    }

    async getAddress(id: string) {
        return this.get(VENDOR_ROUTES.ADDRESS_BY_ID, { params: { id } })
    }
}
