import { invoiceResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export class InvoicesClient implements ICrudClient {
    readonly key = invoiceResource.key

    constructor(private readonly apiClient: ApiClient) {}

    list = (query?: Record<string, unknown>) =>
        this.apiClient.get(invoiceResource.routes.list, query ? { query } as never : undefined) as any

    show = (id: string) =>
        this.apiClient.get(invoiceResource.routes.details as any, { params: { id } } as never) as any

    create = (body: unknown) =>
        this.apiClient.post(invoiceResource.routes.create, body as never) as any

    update = (id: string, body: unknown) =>
        this.apiClient.patch(invoiceResource.routes.update as any, body as never, { params: { id } } as never) as any

    destroy = (_id: string): Promise<unknown> => {
        throw new Error("Invoices cannot be deleted")
    }

    post = (id: string) =>
        this.apiClient.post(invoiceResource.routes.post as any, {} as never, { params: { id } } as never) as any

    cancel = (id: string) =>
        this.apiClient.post(invoiceResource.routes.cancel as any, {} as never, { params: { id } } as never) as any
}
