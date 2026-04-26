import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const PURCHASE_ORDER_ROUTES = {
    INDEX: "/api/purchase-orders",
    BY_ID: "/api/purchase-orders/{id}",
} as const satisfies Record<string, ApiPath>

export class PurchaseOrdersClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(PURCHASE_ORDER_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof PURCHASE_ORDER_ROUTES.INDEX, "post">) {
        return this.post(PURCHASE_ORDER_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof PURCHASE_ORDER_ROUTES.BY_ID, "put">) {
        return this.put(PURCHASE_ORDER_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(PURCHASE_ORDER_ROUTES.BY_ID, { params: { id } })
    }
}
