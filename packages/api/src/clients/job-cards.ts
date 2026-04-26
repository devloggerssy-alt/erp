import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const JOB_CARD_ROUTES = {
    INDEX: "/api/job-cards",
    BY_ID: "/api/job-cards/{id}",
    CHANGE_DATE: "/api/job-cards/{id}/change-date",
    CHANGE_STATUS: "/api/job-cards/{id}/change-status",
    ADD_CUSTOMER_REMARK: "/api/job-cards/{id}/add-customer-remark",
    EDIT_CUSTOMER_REMARK: "/api/job-cards/{id}/edit-customer-remark",
    DELETE_CUSTOMER_REMARK: "/api/job-cards/{id}/delete-customer-remark",
    ADD_SHOP_RECOMMENDATION: "/api/job-cards/{id}/add-shop-recommendation",
    EDIT_SHOP_RECOMMENDATION: "/api/job-cards/{id}/edit-shop-recommendation",
    DELETE_SHOP_RECOMMENDATION: "/api/job-cards/{id}/delete-shop-recommendation",
    ADD_ATTACHMENT: "/api/job-cards/{id}/add-attachment",
    DELETE_ATTACHMENT: "/api/job-cards/{id}/delete-attachment",
    CHANGE_SERVICE_WRITER: "/api/job-cards/{id}/change-service-writer-id",
    CHANGE_SALES_PERSON: "/api/job-cards/{id}/change-sales-person-id",
} as const satisfies Record<string, ApiPath>

export class JobCardsClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(JOB_CARD_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async show(id: string) {
        const res = await this.get(JOB_CARD_ROUTES.INDEX, { params: { id }, query: { id } } as never)
        return { ...res, data: res.data?.[0] ?? null, }
    }

    async create(payload: ApiRequestBody<typeof JOB_CARD_ROUTES.INDEX, "post">) {
        return this.post(JOB_CARD_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof JOB_CARD_ROUTES.BY_ID, "put">) {
        return this.put(JOB_CARD_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(JOB_CARD_ROUTES.BY_ID, { params: { id } })
    }

    async changeDate(id: string, payload: ApiRequestBody<typeof JOB_CARD_ROUTES.CHANGE_DATE, "post">) {
        return this.post(JOB_CARD_ROUTES.CHANGE_DATE, payload, { params: { id } })
    }

    async changeStatus(id: string, payload: ApiRequestBody<typeof JOB_CARD_ROUTES.CHANGE_STATUS, "post">) {
        return this.post(JOB_CARD_ROUTES.CHANGE_STATUS, payload, { params: { id } })
    }

    async addCustomerRemark(id: string, payload: ApiRequestBody<typeof JOB_CARD_ROUTES.ADD_CUSTOMER_REMARK, "post">) {
        return this.post(JOB_CARD_ROUTES.ADD_CUSTOMER_REMARK, payload, { params: { id } })
    }

    async editCustomerRemark(id: string, payload: ApiRequestBody<typeof JOB_CARD_ROUTES.EDIT_CUSTOMER_REMARK, "post">) {
        return this.post(JOB_CARD_ROUTES.EDIT_CUSTOMER_REMARK, payload, { params: { id } })
    }

    async deleteCustomerRemark(id: string) {
        return this.delete(JOB_CARD_ROUTES.DELETE_CUSTOMER_REMARK, { params: { id } })
    }

    async addShopRecommendation(id: string, payload: ApiRequestBody<typeof JOB_CARD_ROUTES.ADD_SHOP_RECOMMENDATION, "post">) {
        return this.post(JOB_CARD_ROUTES.ADD_SHOP_RECOMMENDATION, payload, { params: { id } })
    }

    async editShopRecommendation(id: string, payload: ApiRequestBody<typeof JOB_CARD_ROUTES.EDIT_SHOP_RECOMMENDATION, "post">) {
        return this.post(JOB_CARD_ROUTES.EDIT_SHOP_RECOMMENDATION, payload, { params: { id } })
    }

    async deleteShopRecommendation(id: string) {
        return this.delete(JOB_CARD_ROUTES.DELETE_SHOP_RECOMMENDATION, { params: { id } })
    }

    async addAttachment(id: string, files: File[]) {
        const fd = new FormData()
        for (const file of files) {
            fd.append("attachments[]", file)
        }
        return this.postFormData(`/api/job-cards/${id}/add-attachment`, fd)
    }

    async deleteAttachment(id: string, attachmentId: number) {
        return this.post(JOB_CARD_ROUTES.DELETE_ATTACHMENT, { attachment_id: attachmentId } as never, { params: { id } })
    }

    async changeServiceWriter(id: string, payload: ApiRequestBody<typeof JOB_CARD_ROUTES.CHANGE_SERVICE_WRITER, "post">) {
        return this.post(JOB_CARD_ROUTES.CHANGE_SERVICE_WRITER, payload, { params: { id } })
    }

    async changeSalesPerson(id: string, payload: ApiRequestBody<typeof JOB_CARD_ROUTES.CHANGE_SALES_PERSON, "post">) {
        return this.post(JOB_CARD_ROUTES.CHANGE_SALES_PERSON, payload, { params: { id } })
    }
}
