import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiResponse } from "../infra/types"

export const HOME_ROUTES = {
    DASHBOARD: "/api/home",
} as const satisfies Record<string, ApiPath>

export type HomeDashboardResponse = ApiResponse<typeof HOME_ROUTES.DASHBOARD, "get">

export class HomeClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async dashboard() {
        return this.get(HOME_ROUTES.DASHBOARD)
    }
}
