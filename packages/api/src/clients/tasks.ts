import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const TASK_ROUTES = {
    TYPES: "/api/task-types",
    TYPE_BY_ID: "/api/task-types/{id}",
    SET_DEFAULT_TYPE: "/api/set-default-task-type",
    REMOVE_DEFAULT_TYPE: "/api/remove-default-task-type",
    SECTIONS: "/api/task-sections",
    SECTION_BY_ID: "/api/task-sections/{id}",
    SET_DEFAULT_SECTION: "/api/set-default-task-section",
    REMOVE_DEFAULT_SECTION: "/api/remove-default-task-section",
    CHANGE_SECTION_ARRANGEMENT: "/api/change-task-section-arrangement",
    TASKS: "/api/tasks",
    TASK_BY_ID: "/api/tasks/{id}",
    COMPLETE: "/api/tasks/{id}/complete",
} as const satisfies Record<string, ApiPath>

export class TasksClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    // ── Task Types ──
    async listTypes(query?: ApiListQueryParams) {
        return this.get(TASK_ROUTES.TYPES, query ? { query } as never : undefined)
    }

    async createType(payload: ApiRequestBody<typeof TASK_ROUTES.TYPES, "post">) {
        return this.post(TASK_ROUTES.TYPES, payload)
    }

    async updateType(id: string, payload: ApiRequestBody<typeof TASK_ROUTES.TYPE_BY_ID, "put">) {
        return this.put(TASK_ROUTES.TYPE_BY_ID, payload, { params: { id } })
    }

    async destroyType(id: string) {
        return this.delete(TASK_ROUTES.TYPE_BY_ID, { params: { id } })
    }

    async setDefaultType(payload: ApiRequestBody<typeof TASK_ROUTES.SET_DEFAULT_TYPE, "post">) {
        return this.post(TASK_ROUTES.SET_DEFAULT_TYPE, payload)
    }

    async removeDefaultType(payload: ApiRequestBody<typeof TASK_ROUTES.REMOVE_DEFAULT_TYPE, "post">) {
        return this.post(TASK_ROUTES.REMOVE_DEFAULT_TYPE, payload)
    }

    // ── Task Sections ──
    async listSections(query?: ApiListQueryParams) {
        return this.get(TASK_ROUTES.SECTIONS, query ? { query } as never : undefined)
    }

    async createSection(payload: ApiRequestBody<typeof TASK_ROUTES.SECTIONS, "post">) {
        return this.post(TASK_ROUTES.SECTIONS, payload)
    }

    async updateSection(id: string, payload: ApiRequestBody<typeof TASK_ROUTES.SECTION_BY_ID, "put">) {
        return this.put(TASK_ROUTES.SECTION_BY_ID, payload, { params: { id } })
    }

    async destroySection(id: string) {
        return this.delete(TASK_ROUTES.SECTION_BY_ID, { params: { id } })
    }

    async setDefaultSection(payload: ApiRequestBody<typeof TASK_ROUTES.SET_DEFAULT_SECTION, "post">) {
        return this.post(TASK_ROUTES.SET_DEFAULT_SECTION, payload)
    }

    async removeDefaultSection(payload: ApiRequestBody<typeof TASK_ROUTES.REMOVE_DEFAULT_SECTION, "post">) {
        return this.post(TASK_ROUTES.REMOVE_DEFAULT_SECTION, payload)
    }

    async changeSectionArrangement(payload: ApiRequestBody<typeof TASK_ROUTES.CHANGE_SECTION_ARRANGEMENT, "post">) {
        return this.post(TASK_ROUTES.CHANGE_SECTION_ARRANGEMENT, payload)
    }

    // ── Tasks ──
    async list(query?: ApiListQueryParams) {
        return this.get(TASK_ROUTES.TASKS, query ? { query } as never : undefined)
    }

    async create(payload: ApiRequestBody<typeof TASK_ROUTES.TASKS, "post">) {
        return this.post(TASK_ROUTES.TASKS, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof TASK_ROUTES.TASK_BY_ID, "put">) {
        return this.put(TASK_ROUTES.TASK_BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(TASK_ROUTES.TASK_BY_ID, { params: { id } })
    }

    async complete(id: string, payload: ApiRequestBody<typeof TASK_ROUTES.COMPLETE, "post">) {
        return this.post(TASK_ROUTES.COMPLETE, payload, { params: { id } })
    }
}
