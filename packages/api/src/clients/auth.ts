import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"

export const AUTH_ROUTES = {
    LOGIN: "/api/login",
    PROFILE: "/api/profile",
    LOGOUT: "/api/logout",
} as const satisfies Record<string, ApiPath>

export class AuthClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async login(payload: ApiRequestBody<typeof AUTH_ROUTES.LOGIN, "post">) {
        return this.post(AUTH_ROUTES.LOGIN, payload)
    }

    async profile() {
        return this.get(AUTH_ROUTES.PROFILE)
    }

    async logout() {
        return this.post(AUTH_ROUTES.LOGOUT, undefined)
    }
}
