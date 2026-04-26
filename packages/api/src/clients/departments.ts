import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const DEPARTMENT_ROUTES = {
    INDEX: "/api/departments",
    BY_ID: "/api/departments/{id}",
    SET_FAVORITE: "/api/set-favorite-department",
    REMOVE_FAVORITE: "/api/remove-favorite-department",
} as const satisfies Record<string, ApiPath>

export class DepartmentsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(DEPARTMENT_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof DEPARTMENT_ROUTES.INDEX, "post">) {
        return this.post(DEPARTMENT_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof DEPARTMENT_ROUTES.BY_ID, "put">) {
        return this.put(DEPARTMENT_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(DEPARTMENT_ROUTES.BY_ID, { params: { id } })
    }

    async setFavorite(payload: ApiRequestBody<typeof DEPARTMENT_ROUTES.SET_FAVORITE, "post">) {
        return this.post(DEPARTMENT_ROUTES.SET_FAVORITE, payload)
    }

    async removeFavorite(payload: ApiRequestBody<typeof DEPARTMENT_ROUTES.REMOVE_FAVORITE, "post">) {
        return this.post(DEPARTMENT_ROUTES.REMOVE_FAVORITE, payload)
    }
}
