import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const INSPECTION_ROUTES = {
    CATEGORIES: "/api/inspection-categories",
    CATEGORY_BY_ID: "/api/inspection-categories/{id}",
    INDEX: "/api/inspections",
    BY_ID: "/api/inspections/{id}",
    CHANGE_STATUS: "/api/change-inspection-status",
    CHECKPOINT_LABELS: "/api/check-point-label",
    CHECKPOINT_LABEL_BY_ID: "/api/check-point-label/{id}",
    CHECKPOINTS: "/api/inspection-check-points",
    CHECKPOINT_BY_ID: "/api/inspection-check-points/{id}",
    TOGGLE_LABEL_TO_CHECKPOINT: "/api/toggle-label-to-checkpoint",
    CHECKPOINT_CHANGE_STATUS: "/api/inspection-check-points/change-status",
    CHECKPOINT_ADD_ATTACHMENT: "/api/inspection-check-points/add-attachment",
    CHECKPOINT_UPLOAD_MEDIA: "/api/inspection-check-points/{id}/upload-media",
    CHECKPOINT_MEDIA: "/api/inspection-check-points/{id}/media",
} as const satisfies Record<string, ApiPath>

export class InspectionsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    // ── Categories ──
    async listCategories(query?: ApiListQueryParams) {
        return this.get(INSPECTION_ROUTES.CATEGORIES, query ? { query } as never : undefined)
    }

    async createCategory(payload: ApiRequestBody<typeof INSPECTION_ROUTES.CATEGORIES, "post">) {
        return this.post(INSPECTION_ROUTES.CATEGORIES, payload)
    }

    async updateCategory(id: string, payload: ApiRequestBody<typeof INSPECTION_ROUTES.CATEGORY_BY_ID, "put">) {
        return this.put(INSPECTION_ROUTES.CATEGORY_BY_ID, payload, { params: { id } })
    }

    async destroyCategory(id: string) {
        return this.delete(INSPECTION_ROUTES.CATEGORY_BY_ID, { params: { id } })
    }

    // ── Inspections ──
    async list(query?: ApiListQueryParams) {
        return this.get(INSPECTION_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof INSPECTION_ROUTES.INDEX, "post">) {
        return this.post(INSPECTION_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof INSPECTION_ROUTES.BY_ID, "put">) {
        return this.put(INSPECTION_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(INSPECTION_ROUTES.BY_ID, { params: { id } })
    }

    async changeStatus(payload: ApiRequestBody<typeof INSPECTION_ROUTES.CHANGE_STATUS, "post">) {
        return this.post(INSPECTION_ROUTES.CHANGE_STATUS, payload)
    }

    // ── Checkpoint Labels ──
    async listCheckpointLabels(query?: ApiListQueryParams) {
        return this.get(INSPECTION_ROUTES.CHECKPOINT_LABELS, query ? { query } as never : undefined)
    }

    async createCheckpointLabel(payload: ApiRequestBody<typeof INSPECTION_ROUTES.CHECKPOINT_LABELS, "post">) {
        return this.post(INSPECTION_ROUTES.CHECKPOINT_LABELS, payload)
    }

    async updateCheckpointLabel(id: string, payload: ApiRequestBody<typeof INSPECTION_ROUTES.CHECKPOINT_LABEL_BY_ID, "put">) {
        return this.put(INSPECTION_ROUTES.CHECKPOINT_LABEL_BY_ID, payload, { params: { id } })
    }

    async destroyCheckpointLabel(id: string) {
        return this.delete(INSPECTION_ROUTES.CHECKPOINT_LABEL_BY_ID, { params: { id } })
    }

    // ── Checkpoints ──
    async listCheckpoints(query?: ApiListQueryParams) {
        return this.get(INSPECTION_ROUTES.CHECKPOINTS, query ? { query } as never : undefined)
    }

    async createCheckpoint(payload: ApiRequestBody<typeof INSPECTION_ROUTES.CHECKPOINTS, "post">) {
        return this.post(INSPECTION_ROUTES.CHECKPOINTS, payload)
    }

    async updateCheckpoint(id: string, payload: ApiRequestBody<typeof INSPECTION_ROUTES.CHECKPOINT_BY_ID, "put">) {
        return this.put(INSPECTION_ROUTES.CHECKPOINT_BY_ID, payload, { params: { id } })
    }

    async destroyCheckpoint(id: string) {
        return this.delete(INSPECTION_ROUTES.CHECKPOINT_BY_ID, { params: { id } })
    }

    async toggleLabelToCheckpoint(payload: ApiRequestBody<typeof INSPECTION_ROUTES.TOGGLE_LABEL_TO_CHECKPOINT, "post">) {
        return this.post(INSPECTION_ROUTES.TOGGLE_LABEL_TO_CHECKPOINT, payload)
    }

    async changeCheckpointStatus(payload: ApiRequestBody<typeof INSPECTION_ROUTES.CHECKPOINT_CHANGE_STATUS, "post">) {
        return this.post(INSPECTION_ROUTES.CHECKPOINT_CHANGE_STATUS, payload)
    }

    async addCheckpointAttachment(payload: ApiRequestBody<typeof INSPECTION_ROUTES.CHECKPOINT_ADD_ATTACHMENT, "post">) {
        return this.post(INSPECTION_ROUTES.CHECKPOINT_ADD_ATTACHMENT, payload)
    }

    async uploadCheckpointMedia(id: string, payload: ApiRequestBody<typeof INSPECTION_ROUTES.CHECKPOINT_UPLOAD_MEDIA, "post">) {
        return this.post(INSPECTION_ROUTES.CHECKPOINT_UPLOAD_MEDIA, payload, { params: { id } })
    }

    async deleteCheckpointMedia(id: string) {
        return this.delete(INSPECTION_ROUTES.CHECKPOINT_MEDIA, { params: { id } })
    }
}
