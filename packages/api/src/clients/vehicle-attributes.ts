import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const VEHICLE_ATTRIBUTE_ROUTES = {
    BODY_TYPES: "/api/vehicle-body-types",
    BODY_TYPE_BY_ID: "/api/vehicle-body-types/{id}",
    FUEL_TYPES: "/api/vehicle-fuel-types",
    FUEL_TYPE_BY_ID: "/api/vehicle-fuel-types/{id}",
    TRANSMISSIONS: "/api/vehicle-transmissions",
    TRANSMISSION_BY_ID: "/api/vehicle-transmissions/{id}",
    COLORS: "/api/vehicle-colors",
    COLOR_BY_ID: "/api/vehicle-colors/{id}",
} as const satisfies Record<string, ApiPath>

export class VehicleAttributesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    // ── Body Types ──
    async listBodyTypes(query?: ApiListQueryParams) {
        return this.get(VEHICLE_ATTRIBUTE_ROUTES.BODY_TYPES, query ? { query } as never : undefined)
    }

    async createBodyType(payload: ApiRequestBody<typeof VEHICLE_ATTRIBUTE_ROUTES.BODY_TYPES, "post">) {
        return this.post(VEHICLE_ATTRIBUTE_ROUTES.BODY_TYPES, payload)
    }

    async updateBodyType(id: string, payload: ApiRequestBody<typeof VEHICLE_ATTRIBUTE_ROUTES.BODY_TYPE_BY_ID, "put">) {
        return this.put(VEHICLE_ATTRIBUTE_ROUTES.BODY_TYPE_BY_ID, payload, { params: { id } })
    }

    async destroyBodyType(id: string) {
        return this.delete(VEHICLE_ATTRIBUTE_ROUTES.BODY_TYPE_BY_ID, { params: { id } })
    }

    // ── Fuel Types ──
    async listFuelTypes(query?: ApiListQueryParams) {
        return this.get(VEHICLE_ATTRIBUTE_ROUTES.FUEL_TYPES, query ? { query } as never : undefined)
    }

    async createFuelType(payload: ApiRequestBody<typeof VEHICLE_ATTRIBUTE_ROUTES.FUEL_TYPES, "post">) {
        return this.post(VEHICLE_ATTRIBUTE_ROUTES.FUEL_TYPES, payload)
    }

    async updateFuelType(id: string, payload: ApiRequestBody<typeof VEHICLE_ATTRIBUTE_ROUTES.FUEL_TYPE_BY_ID, "put">) {
        return this.put(VEHICLE_ATTRIBUTE_ROUTES.FUEL_TYPE_BY_ID, payload, { params: { id } })
    }

    async destroyFuelType(id: string) {
        return this.delete(VEHICLE_ATTRIBUTE_ROUTES.FUEL_TYPE_BY_ID, { params: { id } })
    }

    // ── Transmissions ──
    async listTransmissions(query?: ApiListQueryParams) {
        return this.get(VEHICLE_ATTRIBUTE_ROUTES.TRANSMISSIONS, query ? { query } as never : undefined)
    }

    async createTransmission(payload: ApiRequestBody<typeof VEHICLE_ATTRIBUTE_ROUTES.TRANSMISSIONS, "post">) {
        return this.post(VEHICLE_ATTRIBUTE_ROUTES.TRANSMISSIONS, payload)
    }

    async updateTransmission(id: string, payload: ApiRequestBody<typeof VEHICLE_ATTRIBUTE_ROUTES.TRANSMISSION_BY_ID, "put">) {
        return this.put(VEHICLE_ATTRIBUTE_ROUTES.TRANSMISSION_BY_ID, payload, { params: { id } })
    }

    async destroyTransmission(id: string) {
        return this.delete(VEHICLE_ATTRIBUTE_ROUTES.TRANSMISSION_BY_ID, { params: { id } })
    }

    // ── Colors ──
    async listColors(query?: ApiListQueryParams) {
        return this.get(VEHICLE_ATTRIBUTE_ROUTES.COLORS, query ? { query } as never : undefined)
    }

    async createColor(payload: ApiRequestBody<typeof VEHICLE_ATTRIBUTE_ROUTES.COLORS, "post">) {
        return this.post(VEHICLE_ATTRIBUTE_ROUTES.COLORS, payload)
    }

    async updateColor(id: string, payload: ApiRequestBody<typeof VEHICLE_ATTRIBUTE_ROUTES.COLOR_BY_ID, "put">) {
        return this.put(VEHICLE_ATTRIBUTE_ROUTES.COLOR_BY_ID, payload, { params: { id } })
    }

    async destroyColor(id: string) {
        return this.delete(VEHICLE_ATTRIBUTE_ROUTES.COLOR_BY_ID, { params: { id } })
    }
}
