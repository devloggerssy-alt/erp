import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath } from "../infra/types"

export const GEO_ROUTES = {
    COUNTRIES: "/api/countries",
    STATES: "/api/states",
} as const satisfies Record<string, ApiPath>

export class GeoClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async countries() {
        return this.get(GEO_ROUTES.COUNTRIES)
    }

    async states() {
        return this.get(GEO_ROUTES.STATES)
    }
}
