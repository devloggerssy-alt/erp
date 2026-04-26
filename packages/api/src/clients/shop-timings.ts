import { CrudClient } from "../infra/crud-client"
import type { ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"

export const SHOP_TIMING_ROUTES = {
    INDEX: "/api/shop-timings",
    BY_ID: "/api/shop-timings/{id}",
    SET_DEFAULT: "/api/set-default-shop-timing",
    REMOVE_DEFAULT: "/api/remove-default-shop-timing",
} as const satisfies Record<string, ApiPath>

export class ShopTimingsClient extends CrudClient<
    typeof SHOP_TIMING_ROUTES.INDEX,
    typeof SHOP_TIMING_ROUTES.BY_ID
> {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions, SHOP_TIMING_ROUTES.INDEX, SHOP_TIMING_ROUTES.BY_ID)
    }

    async setDefault(payload: ApiRequestBody<typeof SHOP_TIMING_ROUTES.SET_DEFAULT, "post">) {
        return this.post(SHOP_TIMING_ROUTES.SET_DEFAULT, payload)
    }

    async removeDefault(payload: ApiRequestBody<typeof SHOP_TIMING_ROUTES.REMOVE_DEFAULT, "post">) {
        return this.post(SHOP_TIMING_ROUTES.REMOVE_DEFAULT, payload)
    }
}
