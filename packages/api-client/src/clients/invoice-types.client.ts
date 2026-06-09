import { invoiceTypeResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export class InvoiceTypesClient implements ICrudClient {
    readonly key = invoiceTypeResource.key

    constructor(private readonly apiClient: ApiClient) {}

    list = (query?: Record<string, unknown>) =>
        this.apiClient.get(invoiceTypeResource.routes.list, query ? { query } as never : undefined) as any

    show = (id: string) =>
        this.apiClient.get(invoiceTypeResource.routes.details as any, { params: { id } } as never) as any

    create = (body: unknown) =>
        this.apiClient.post(invoiceTypeResource.routes.create, body as never) as any

    update = (id: string, body: unknown) =>
        this.apiClient.patch(invoiceTypeResource.routes.update as any, body as never, { params: { id } } as never) as any

    destroy = (_id: string): Promise<unknown> => {
        throw new Error("Invoice types cannot be deleted via this client")
    }
}
