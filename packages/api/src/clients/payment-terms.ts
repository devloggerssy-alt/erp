import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const PAYMENT_TERM_ROUTES = {
    INDEX: "/api/payment-terms",
    BY_ID: "/api/payment-terms/{id}",
    SET_DEFAULT: "/api/set-default-payment-term",
} as const satisfies Record<string, ApiPath>

export class PaymentTermsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(PAYMENT_TERM_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof PAYMENT_TERM_ROUTES.INDEX, "post">) {
        return this.post(PAYMENT_TERM_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof PAYMENT_TERM_ROUTES.BY_ID, "put">) {
        return this.put(PAYMENT_TERM_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(PAYMENT_TERM_ROUTES.BY_ID, { params: { id } })
    }

    async setDefault(payload: ApiRequestBody<typeof PAYMENT_TERM_ROUTES.SET_DEFAULT, "post">) {
        return this.post(PAYMENT_TERM_ROUTES.SET_DEFAULT, payload)
    }
}
