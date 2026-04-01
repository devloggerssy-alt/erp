import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const HOLIDAY_YEAR_ROUTES = {
    INDEX: "/api/holiday-years",
} as const satisfies Record<string, ApiPath>

export class HolidayYearsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(HOLIDAY_YEAR_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof HOLIDAY_YEAR_ROUTES.INDEX, "post">) {
        return this.post(HOLIDAY_YEAR_ROUTES.INDEX, payload)
    }
}
