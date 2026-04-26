import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const REFERRAL_SOURCE_ROUTES = {
    INDEX: "/api/referral-sources",
    BY_ID: "/api/referral-sources/{id}",
    SET_DEFAULT: "/api/set-default-referral-source",
} as const satisfies Record<string, ApiPath>

export class ReferralSourcesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(REFERRAL_SOURCE_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof REFERRAL_SOURCE_ROUTES.INDEX, "post">) {
        return this.post(REFERRAL_SOURCE_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof REFERRAL_SOURCE_ROUTES.BY_ID, "put">) {
        return this.put(REFERRAL_SOURCE_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(REFERRAL_SOURCE_ROUTES.BY_ID, { params: { id } })
    }

    async setDefault(payload: ApiRequestBody<typeof REFERRAL_SOURCE_ROUTES.SET_DEFAULT, "post">) {
        return this.post(REFERRAL_SOURCE_ROUTES.SET_DEFAULT, payload)
    }
}
