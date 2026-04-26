import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const INSURANCE_TYPE_ROUTES = {
    INDEX: "/api/insurance-types",
    BY_ID: "/api/insurance-types/{id}",
} as const satisfies Record<string, ApiPath>

export class InsuranceTypesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(INSURANCE_TYPE_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof INSURANCE_TYPE_ROUTES.INDEX, "post">) {
        return this.post(INSURANCE_TYPE_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof INSURANCE_TYPE_ROUTES.BY_ID, "put">) {
        return this.put(INSURANCE_TYPE_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(INSURANCE_TYPE_ROUTES.BY_ID, { params: { id } })
    }
}
