import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const PAYMENT_ROUTES = {
    MODES: "/api/payment-mode",
    MODE_BY_ID: "/api/payment-mode/{id}",
    RECEIVED: "/api/payment-recieved",
    RECEIVED_BY_ID: "/api/payment-recieved/{id}",
} as const satisfies Record<string, ApiPath>

export class PaymentsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    // ── Payment Modes ──
    async listModes(query?: ApiListQueryParams) {
        return this.get(PAYMENT_ROUTES.MODES, query ? { query } as never : undefined)
    }

    async createMode(payload: ApiRequestBody<typeof PAYMENT_ROUTES.MODES, "post">) {
        return this.post(PAYMENT_ROUTES.MODES, payload)
    }

    async updateMode(id: string, payload: ApiRequestBody<typeof PAYMENT_ROUTES.MODE_BY_ID, "put">) {
        return this.put(PAYMENT_ROUTES.MODE_BY_ID, payload, { params: { id } })
    }

    async destroyMode(id: string) {
        return this.delete(PAYMENT_ROUTES.MODE_BY_ID, { params: { id } })
    }

    // ── Payment Received ──
    async listReceived(query?: ApiListQueryParams) {
        return this.get(PAYMENT_ROUTES.RECEIVED, query ? { query } as never : undefined)
    }

    async createReceived(payload: ApiRequestBody<typeof PAYMENT_ROUTES.RECEIVED, "post">) {
        return this.post(PAYMENT_ROUTES.RECEIVED, payload)
    }

    async updateReceived(id: string, payload: ApiRequestBody<typeof PAYMENT_ROUTES.RECEIVED_BY_ID, "post">) {
        return this.post(PAYMENT_ROUTES.RECEIVED_BY_ID, payload, { params: { id } })
    }

    async destroyReceived(id: string) {
        return this.delete(PAYMENT_ROUTES.RECEIVED_BY_ID, { params: { id } })
    }
}
