import { expenseResource } from "@devloggers/api-contracts"
import type { ApiPathByMethod } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient, BaseCrudItem } from "../infra/crud-client"

export class ExpensesClient implements ICrudClient {
  readonly key = expenseResource.key

  constructor(private readonly apiClient: ApiClient) {}

  list(query?: Record<string, unknown>): Promise<{ data?: ReadonlyArray<BaseCrudItem>; meta?: unknown }> {
    const route = expenseResource.routes.list as ApiPathByMethod<"get">
    return this.apiClient.get(route, query ? { query } as never : undefined) as any
  }

  show(id: string): Promise<{ data?: BaseCrudItem }> {
    const route = expenseResource.routes.show as ApiPathByMethod<"get">
    return this.apiClient.get(route, { params: { id } } as never) as any
  }

  create(body: unknown): Promise<unknown> {
    const route = expenseResource.routes.create as ApiPathByMethod<"post">
    return this.apiClient.post(route, body as never) as any
  }

  update(id: string, body: unknown): Promise<unknown> {
    const route = expenseResource.routes.update as ApiPathByMethod<"patch">
    return this.apiClient.patch(route, body as never, { params: { id } } as never) as any
  }

  destroy(id: string): Promise<unknown> {
    const route = expenseResource.routes.delete as ApiPathByMethod<"delete">
    return this.apiClient.delete(route, { params: { id } } as never) as any
  }

  post = (id: string) => {
    const route = expenseResource.routes.post as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }

  cancel = (id: string) => {
    const route = expenseResource.routes.cancel as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }
}
