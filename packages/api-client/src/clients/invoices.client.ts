import { invoiceResource } from "@devloggers/api-contracts"
import type { ApiPathByMethod } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient, BaseCrudItem } from "../infra/crud-client"

export class InvoicesClient implements ICrudClient {
  readonly key = invoiceResource.key

  constructor(private readonly apiClient: ApiClient) {}

  list(query?: Record<string, unknown>): Promise<{ data?: ReadonlyArray<BaseCrudItem>; meta?: unknown }> {
    const route = invoiceResource.routes.list as ApiPathByMethod<"get">
    return this.apiClient.get(route, query ? { query } as never : undefined) as any
  }

  show(id: string): Promise<{ data?: BaseCrudItem }> {
    const route = invoiceResource.routes.show as ApiPathByMethod<"get">
    return this.apiClient.get(route, { params: { id } } as never) as any
  }

  create(body: unknown): Promise<unknown> {
    const route = invoiceResource.routes.create as ApiPathByMethod<"post">
    return this.apiClient.post(route, body as never) as any
  }

  update(id: string, body: unknown): Promise<unknown> {
    const route = invoiceResource.routes.update as ApiPathByMethod<"patch">
    return this.apiClient.patch(route, body as never, { params: { id } } as never) as any
  }

  destroy(_id: string): Promise<unknown> {
    throw new Error("Invoices cannot be deleted — use cancel() instead")
  }

  post = (id: string) => {
    const route = invoiceResource.routes.post as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }

  cancel = (id: string) => {
    const route = invoiceResource.routes.cancel as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }
}
