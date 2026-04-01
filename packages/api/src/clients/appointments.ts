import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const APPOINTMENT_ROUTES = {
    INDEX: "/api/appointments",
    BY_ID: "/api/appointments/{id}",
    UNLINK_JOB_CARD: "/api/appointments/{id}/un-link-job-card",
} as const satisfies Record<string, ApiPath>

export class AppointmentsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(APPOINTMENT_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof APPOINTMENT_ROUTES.INDEX, "post">) {
        return this.post(APPOINTMENT_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof APPOINTMENT_ROUTES.BY_ID, "put">) {
        return this.put(APPOINTMENT_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(APPOINTMENT_ROUTES.BY_ID, { params: { id } })
    }

    async unlinkJobCard(id: string, payload: ApiRequestBody<typeof APPOINTMENT_ROUTES.UNLINK_JOB_CARD, "post">) {
        return this.post(APPOINTMENT_ROUTES.UNLINK_JOB_CARD, payload, { params: { id } })
    }
}
