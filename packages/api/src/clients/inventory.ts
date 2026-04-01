import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const INVENTORY_ROUTES = {
    UNIT_TYPES: "/api/unit-types",
    UNIT_TYPE_BY_ID: "/api/unit-types/{id}",
    SET_FAVORITE_UNIT_TYPE: "/api/set-favorite-unit-type",
    REMOVE_FAVORITE_UNIT_TYPE: "/api/remove-favorite-unit-type",
    CATEGORIES: "/api/inventory-categories",
    CATEGORY_BY_ID: "/api/inventory-categories/{id}",
    SET_FAVORITE_CATEGORY: "/api/set-favorite-inventory-category",
    REMOVE_FAVORITE_CATEGORY: "/api/remove-favorite-inventory-category",
    LABOR_RATES: "/api/labor-rates",
    LABOR_RATE_BY_ID: "/api/labor-rates/{id}",
    SET_FAVORITE_LABOR_RATE: "/api/set-favorite-labor-rate",
    REMOVE_FAVORITE_LABOR_RATE: "/api/remove-favorite-labor-rate",
} as const satisfies Record<string, ApiPath>

export class InventoryClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    // ── Unit Types ──
    async listUnitTypes(query?: ApiListQueryParams) {
        return this.get(INVENTORY_ROUTES.UNIT_TYPES, query ? { query } as never : undefined)
    }

    async createUnitType(payload: ApiRequestBody<typeof INVENTORY_ROUTES.UNIT_TYPES, "post">) {
        return this.post(INVENTORY_ROUTES.UNIT_TYPES, payload)
    }

    async updateUnitType(id: string, payload: ApiRequestBody<typeof INVENTORY_ROUTES.UNIT_TYPE_BY_ID, "put">) {
        return this.put(INVENTORY_ROUTES.UNIT_TYPE_BY_ID, payload, { params: { id } })
    }

    async destroyUnitType(id: string) {
        return this.delete(INVENTORY_ROUTES.UNIT_TYPE_BY_ID, { params: { id } })
    }

    async setFavoriteUnitType(payload: ApiRequestBody<typeof INVENTORY_ROUTES.SET_FAVORITE_UNIT_TYPE, "post">) {
        return this.post(INVENTORY_ROUTES.SET_FAVORITE_UNIT_TYPE, payload)
    }

    async removeFavoriteUnitType(payload: ApiRequestBody<typeof INVENTORY_ROUTES.REMOVE_FAVORITE_UNIT_TYPE, "post">) {
        return this.post(INVENTORY_ROUTES.REMOVE_FAVORITE_UNIT_TYPE, payload)
    }

    // ── Inventory Categories ──
    async listCategories(query?: ApiListQueryParams) {
        return this.get(INVENTORY_ROUTES.CATEGORIES, query ? { query } as never : undefined)
    }

    async createCategory(payload: ApiRequestBody<typeof INVENTORY_ROUTES.CATEGORIES, "post">) {
        return this.post(INVENTORY_ROUTES.CATEGORIES, payload)
    }

    async updateCategory(id: string, payload: ApiRequestBody<typeof INVENTORY_ROUTES.CATEGORY_BY_ID, "put">) {
        return this.put(INVENTORY_ROUTES.CATEGORY_BY_ID, payload, { params: { id } })
    }

    async destroyCategory(id: string) {
        return this.delete(INVENTORY_ROUTES.CATEGORY_BY_ID, { params: { id } })
    }

    async setFavoriteCategory(payload: ApiRequestBody<typeof INVENTORY_ROUTES.SET_FAVORITE_CATEGORY, "post">) {
        return this.post(INVENTORY_ROUTES.SET_FAVORITE_CATEGORY, payload)
    }

    async removeFavoriteCategory(payload: ApiRequestBody<typeof INVENTORY_ROUTES.REMOVE_FAVORITE_CATEGORY, "post">) {
        return this.post(INVENTORY_ROUTES.REMOVE_FAVORITE_CATEGORY, payload)
    }

    // ── Labor Rates ──
    async listLaborRates(query?: ApiListQueryParams) {
        return this.get(INVENTORY_ROUTES.LABOR_RATES, query ? { query } as never : undefined)
    }

    async createLaborRate(payload: ApiRequestBody<typeof INVENTORY_ROUTES.LABOR_RATES, "post">) {
        return this.post(INVENTORY_ROUTES.LABOR_RATES, payload)
    }

    async updateLaborRate(id: string, payload: ApiRequestBody<typeof INVENTORY_ROUTES.LABOR_RATE_BY_ID, "put">) {
        return this.put(INVENTORY_ROUTES.LABOR_RATE_BY_ID, payload, { params: { id } })
    }

    async destroyLaborRate(id: string) {
        return this.delete(INVENTORY_ROUTES.LABOR_RATE_BY_ID, { params: { id } })
    }

    async setFavoriteLaborRate(payload: ApiRequestBody<typeof INVENTORY_ROUTES.SET_FAVORITE_LABOR_RATE, "post">) {
        return this.post(INVENTORY_ROUTES.SET_FAVORITE_LABOR_RATE, payload)
    }

    async removeFavoriteLaborRate(payload: ApiRequestBody<typeof INVENTORY_ROUTES.REMOVE_FAVORITE_LABOR_RATE, "post">) {
        return this.post(INVENTORY_ROUTES.REMOVE_FAVORITE_LABOR_RATE, payload)
    }
}
