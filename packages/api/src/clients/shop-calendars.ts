import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const SHOP_CALENDAR_ROUTES = {
    INDEX: "/api/shop-calenders",
    BY_ID: "/api/shop-calenders/{id}",
    SET_DEFAULT: "/api/set-default-shop-calender",
    REMOVE_DEFAULT: "/api/remove-default-shop-calender",
    UPDATE_DAY_TYPE: "/api/shop-calenders/{id}/update-day-type",
} as const satisfies Record<string, ApiPath>

export class ShopCalendarsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(SHOP_CALENDAR_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof SHOP_CALENDAR_ROUTES.INDEX, "post">) {
        return this.post(SHOP_CALENDAR_ROUTES.INDEX, payload)
    }

    async destroy(id: string) {
        return this.delete(SHOP_CALENDAR_ROUTES.BY_ID, { params: { id } })
    }

    async setDefault(payload: ApiRequestBody<typeof SHOP_CALENDAR_ROUTES.SET_DEFAULT, "post">) {
        return this.post(SHOP_CALENDAR_ROUTES.SET_DEFAULT, payload)
    }

    async removeDefault(payload: ApiRequestBody<typeof SHOP_CALENDAR_ROUTES.REMOVE_DEFAULT, "post">) {
        return this.post(SHOP_CALENDAR_ROUTES.REMOVE_DEFAULT, payload)
    }

    async updateDayType(id: string, payload: ApiRequestBody<typeof SHOP_CALENDAR_ROUTES.UPDATE_DAY_TYPE, "post">) {
        return this.post(SHOP_CALENDAR_ROUTES.UPDATE_DAY_TYPE, payload, { params: { id } } as never)
    }
}
