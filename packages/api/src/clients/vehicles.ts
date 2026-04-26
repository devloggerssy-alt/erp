import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const VEHICLE_ROUTES = {
    INDEX: "/api/vehicles",
    BY_ID: "/api/vehicles/{id}",
    EXPORT: "/api/vehicles/export",
    IMPORT: "/api/vehicles/import",
    GET_OWNERS: "/api/get-vehicle-owners",
    LINK_CUSTOMER: "/api/link-customer-to-vehicle",
    UNLINK_CUSTOMER: "/api/unlink-customer-from-vehicle",
} as const satisfies Record<string, ApiPath>

function buildVehicleFormData(payload: Record<string, any>): FormData {
    const fd = new FormData()
    for (const [key, value] of Object.entries(payload)) {
        if (value == null) continue
        if (value instanceof File) {
            fd.append(key, value)
        } else {
            fd.append(key, String(value))
        }
    }
    return fd
}

export class VehiclesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(VEHICLE_ROUTES.INDEX, query ? { query } as never : undefined)
    }


    async getById(id: string) {
        return this.get(VEHICLE_ROUTES.BY_ID, { params: { id } })
    }

    async create(payload: ApiRequestBody<typeof VEHICLE_ROUTES.INDEX, "post">) {
        const fd = buildVehicleFormData(payload)
        return this.postFormData(VEHICLE_ROUTES.INDEX, fd)
    }



    async update(id: string, payload: ApiRequestBody<typeof VEHICLE_ROUTES.BY_ID, "put">) {
        const fd = buildVehicleFormData(payload)
        fd.append("_method", "PUT")
        const url = VEHICLE_ROUTES.BY_ID.replace("{id}", id)
        return this.postFormData(url, fd)
    }

    async destroy(id: string) {
        return this.delete(VEHICLE_ROUTES.BY_ID, { params: { id } })
    }

    async export() {
        return this.get(VEHICLE_ROUTES.EXPORT)
    }

    async import(payload: ApiRequestBody<typeof VEHICLE_ROUTES.IMPORT, "post">) {
        return this.post(VEHICLE_ROUTES.IMPORT, payload)
    }

    async getOwners(vehicleId: string | number, query?: ApiListQueryParams) {
        return this.get(VEHICLE_ROUTES.GET_OWNERS, { query: { vehicle_id: vehicleId, ...query } } as never)
    }

    async linkCustomer(payload: ApiRequestBody<typeof VEHICLE_ROUTES.LINK_CUSTOMER, "post">) {
        return this.post(VEHICLE_ROUTES.LINK_CUSTOMER, payload)
    }

    async unlinkCustomer(payload: ApiRequestBody<typeof VEHICLE_ROUTES.UNLINK_CUSTOMER, "post">) {
        return this.post(VEHICLE_ROUTES.UNLINK_CUSTOMER, payload)
    }
}
