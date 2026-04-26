import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const ESTIMATE_ROUTES = {
    INDEX: "/api/estimates",
    BY_ID: "/api/estimates/{id}",
    QUICK_REMARKS: "/api/quick-remark",
    QUICK_REMARK_BY_ID: "/api/quick-remark/{id}",
    QUICK_NOTES: "/api/quick-notes",
    QUICK_NOTE_BY_ID: "/api/quick-notes/{id}",
} as const satisfies Record<string, ApiPath>

export class EstimatesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    // ── Estimates ──
    async list(query?: ApiListQueryParams) {
        return this.get(ESTIMATE_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof ESTIMATE_ROUTES.INDEX, "post">) {
        return this.post(ESTIMATE_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof ESTIMATE_ROUTES.BY_ID, "put">) {
        return this.put(ESTIMATE_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(ESTIMATE_ROUTES.BY_ID, { params: { id } })
    }

    // ── Quick Remarks ──
    async listQuickRemarks(query?: ApiListQueryParams) {
        return this.get(ESTIMATE_ROUTES.QUICK_REMARKS, query ? { query } as never : undefined)
    }

    async createQuickRemark(payload: ApiRequestBody<typeof ESTIMATE_ROUTES.QUICK_REMARKS, "post">) {
        return this.post(ESTIMATE_ROUTES.QUICK_REMARKS, payload)
    }

    async updateQuickRemark(id: string, payload: ApiRequestBody<typeof ESTIMATE_ROUTES.QUICK_REMARK_BY_ID, "put">) {
        return this.put(ESTIMATE_ROUTES.QUICK_REMARK_BY_ID, payload, { params: { id } })
    }

    async destroyQuickRemark(id: string) {
        return this.delete(ESTIMATE_ROUTES.QUICK_REMARK_BY_ID, { params: { id } })
    }

    // ── Quick Notes ──
    async listQuickNotes(query?: ApiListQueryParams) {
        return this.get(ESTIMATE_ROUTES.QUICK_NOTES, query ? { query } as never : undefined)
    }

    async createQuickNote(payload: ApiRequestBody<typeof ESTIMATE_ROUTES.QUICK_NOTES, "post">) {
        return this.post(ESTIMATE_ROUTES.QUICK_NOTES, payload)
    }

    async updateQuickNote(id: string, payload: ApiRequestBody<typeof ESTIMATE_ROUTES.QUICK_NOTE_BY_ID, "put">) {
        return this.put(ESTIMATE_ROUTES.QUICK_NOTE_BY_ID, payload, { params: { id } })
    }

    async destroyQuickNote(id: string) {
        return this.delete(ESTIMATE_ROUTES.QUICK_NOTE_BY_ID, { params: { id } })
    }
}
