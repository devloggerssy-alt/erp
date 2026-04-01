import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const VEHICLE_DOCUMENT_ROUTES = {
    DOCUMENT_TYPES: "/api/document-types",
    DOCUMENT_TYPE_BY_ID: "/api/document-types/{id}",
    DOCUMENTS: "/api/vehicle-documents",
    DOCUMENT_BY_ID: "/api/vehicle-documents/{id}",
    MILEAGE: "/api/vehicle-mile-and-kms",
    MILEAGE_BY_ID: "/api/vehicle-mile-and-kms/{id}",
} as const satisfies Record<string, ApiPath>

export class VehicleDocumentsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    // ── Document Types ──
    async listDocumentTypes(query?: ApiListQueryParams) {
        return this.get(VEHICLE_DOCUMENT_ROUTES.DOCUMENT_TYPES, query ? { query } as never : undefined)
    }

    async createDocumentType(payload: ApiRequestBody<typeof VEHICLE_DOCUMENT_ROUTES.DOCUMENT_TYPES, "post">) {
        return this.post(VEHICLE_DOCUMENT_ROUTES.DOCUMENT_TYPES, payload)
    }

    async updateDocumentType(id: string, payload: ApiRequestBody<typeof VEHICLE_DOCUMENT_ROUTES.DOCUMENT_TYPE_BY_ID, "put">) {
        return this.put(VEHICLE_DOCUMENT_ROUTES.DOCUMENT_TYPE_BY_ID, payload, { params: { id } })
    }

    async destroyDocumentType(id: string) {
        return this.delete(VEHICLE_DOCUMENT_ROUTES.DOCUMENT_TYPE_BY_ID, { params: { id } })
    }

    // ── Vehicle Documents ──
    async listDocuments(query?: ApiListQueryParams & { vehicle_id?: string | number }) {
        return this.get(VEHICLE_DOCUMENT_ROUTES.DOCUMENTS, query ? { query } as never : undefined)
    }

    async createDocument(payload: Record<string, any>) {
        const fd = new FormData()
        for (const [key, value] of Object.entries(payload)) {
            if (value == null) continue
            if (value instanceof File) {
                fd.append(key, value)
            } else {
                fd.append(key, String(value))
            }
        }
        return this.postFormData(VEHICLE_DOCUMENT_ROUTES.DOCUMENTS, fd)
    }

    async updateDocument(id: string, payload: Record<string, any>) {
        const fd = new FormData()
        for (const [key, value] of Object.entries(payload)) {
            if (value == null) continue
            if (value instanceof File) {
                fd.append(key, value)
            } else {
                fd.append(key, String(value))
            }
        }
        fd.append("_method", "PUT")
        const url = VEHICLE_DOCUMENT_ROUTES.DOCUMENT_BY_ID.replace("{id}", id)
        return this.postFormData(url, fd)
    }

    async destroyDocument(id: string) {
        return this.delete(VEHICLE_DOCUMENT_ROUTES.DOCUMENT_BY_ID, { params: { id } })
    }

    // ── Mileage ──
    async listMileage(query?: ApiListQueryParams & { vehicle_id?: string | number }) {
        return this.get(VEHICLE_DOCUMENT_ROUTES.MILEAGE, query ? { query } as never : undefined)
    }

    async createMileage(payload: ApiRequestBody<typeof VEHICLE_DOCUMENT_ROUTES.MILEAGE, "post">) {
        return this.post(VEHICLE_DOCUMENT_ROUTES.MILEAGE, payload)
    }

    async updateMileage(id: string, payload: ApiRequestBody<typeof VEHICLE_DOCUMENT_ROUTES.MILEAGE_BY_ID, "put">) {
        return this.put(VEHICLE_DOCUMENT_ROUTES.MILEAGE_BY_ID, payload, { params: { id } })
    }

    async destroyMileage(id: string) {
        return this.delete(VEHICLE_DOCUMENT_ROUTES.MILEAGE_BY_ID, { params: { id } })
    }
}
