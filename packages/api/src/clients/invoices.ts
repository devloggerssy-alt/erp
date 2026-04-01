import { CrudClient } from "../infra/crud-client"
import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const INVOICE_ROUTES = {
    INDEX: "/api/invoices",
    BY_ID: "/api/invoices/{id}",
    ADD_ATTACHMENT: "/api/invoices/{id}/add-attachment",
    DELETE_ATTACHMENT: "/api/invoices/{id}/delete-attachment",
    DOCUMENTS: "/api/invoice-documents",
    DOCUMENT_BY_ID: "/api/invoice-documents/{id}",
    NOTES: "/api/invoice-notes",
    NOTE_BY_ID: "/api/invoice-notes/{id}",
    LABELS: "/api/invoice-labels",
    LABEL_BY_ID: "/api/invoice-labels/{id}",
} as const satisfies Record<string, ApiPath>

export class InvoicesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    // ── Invoices ──
    async list(query?: ApiListQueryParams) {
        return this.get(INVOICE_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async show(id: string) {
        return this.get(INVOICE_ROUTES.BY_ID, { params: { id } } as never)
    }

    async create(payload: ApiRequestBody<typeof INVOICE_ROUTES.INDEX, "post">) {
        return this.post(INVOICE_ROUTES.INDEX, payload)
    }

    async update(id: string, payload: ApiRequestBody<typeof INVOICE_ROUTES.BY_ID, "put">) {
        return this.put(INVOICE_ROUTES.BY_ID, payload, { params: { id } })
    }

    async destroy(id: string) {
        return this.delete(INVOICE_ROUTES.BY_ID, { params: { id } })
    }

    // ── Attachments ──
    async addAttachment(id: string, file: File) {
        const fd = new FormData()
        fd.append("attachments[]", file)
        return this.postFormData(`/api/invoices/${id}/add-attachment`, fd)
    }

    async deleteAttachment(invoiceId: string, attachmentId: number) {
        return this.delete(INVOICE_ROUTES.DELETE_ATTACHMENT, {
            params: { id: invoiceId },
            body: { attachment_id: attachmentId },
        } as never)
    }

    // ── Documents ──
    async listDocuments(query?: ApiListQueryParams & { invoice_id?: string | number }) {
        return this.get(INVOICE_ROUTES.DOCUMENTS, query ? { query } as never : undefined)
    }

    async createDocument(payload: ApiRequestBody<typeof INVOICE_ROUTES.DOCUMENTS, "post">) {
        return this.post(INVOICE_ROUTES.DOCUMENTS, payload)
    }

    async updateDocument(id: string, payload: ApiRequestBody<typeof INVOICE_ROUTES.DOCUMENT_BY_ID, "put">) {
        return this.put(INVOICE_ROUTES.DOCUMENT_BY_ID, payload, { params: { id } })
    }

    async destroyDocument(id: string) {
        return this.delete(INVOICE_ROUTES.DOCUMENT_BY_ID, { params: { id } })
    }

    // ── Notes ──
    async listNotes(query?: ApiListQueryParams & { invoice_id?: string | number }) {
        return this.get(INVOICE_ROUTES.NOTES, query ? { query } as never : undefined)
    }

    async createNote(payload: ApiRequestBody<typeof INVOICE_ROUTES.NOTES, "post">) {
        return this.post(INVOICE_ROUTES.NOTES, payload)
    }

    async updateNote(id: string, payload: ApiRequestBody<typeof INVOICE_ROUTES.NOTE_BY_ID, "put">) {
        return this.put(INVOICE_ROUTES.NOTE_BY_ID, payload, { params: { id } })
    }

    async destroyNote(id: string) {
        return this.delete(INVOICE_ROUTES.NOTE_BY_ID, { params: { id } })
    }

    // ── Labels ──
    async listLabels(query?: ApiListQueryParams) {
        return this.get(INVOICE_ROUTES.LABELS, query ? { query } as never : undefined)
    }

    async createLabel(payload: ApiRequestBody<typeof INVOICE_ROUTES.LABELS, "post">) {
        return this.post(INVOICE_ROUTES.LABELS, payload)
    }

    async updateLabel(id: string, payload: ApiRequestBody<typeof INVOICE_ROUTES.LABEL_BY_ID, "put">) {
        return this.put(INVOICE_ROUTES.LABEL_BY_ID, payload, { params: { id } })
    }

    async destroyLabel(id: string) {
        return this.delete(INVOICE_ROUTES.LABEL_BY_ID, { params: { id } })
    }
}
