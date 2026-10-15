import { expenseResource } from "@devloggers/api-contracts"
import type { ApiResponse } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export class ExpensesClient implements ICrudClient {
  readonly key = expenseResource.key

  constructor(private readonly apiClient: ApiClient) {}

  list(query?: Record<string, unknown>): Promise<ApiResponse<typeof expenseResource.routes.list, "get">> {
    return this.apiClient.get(
      expenseResource.routes.list,
      query ? ({ query } as never) : undefined,
    )
  }

  show(id: string): Promise<ApiResponse<typeof expenseResource.routes.show, "get">> {
    return this.apiClient.get(expenseResource.routes.show, { params: { id } } as never)
  }

  create(body: unknown): Promise<ApiResponse<typeof expenseResource.routes.create, "post">> {
    return this.apiClient.post(expenseResource.routes.create, body as never)
  }

  update(id: string, body: unknown): Promise<ApiResponse<typeof expenseResource.routes.update, "patch">> {
    return this.apiClient.patch(
      expenseResource.routes.update,
      body as never,
      { params: { id } } as never,
    )
  }

  destroy(id: string): Promise<ApiResponse<typeof expenseResource.routes.delete, "delete">> {
    return this.apiClient.delete(expenseResource.routes.delete, { params: { id } } as never)
  }

  post = (id: string): Promise<ApiResponse<typeof expenseResource.routes.post, "post">> => {
    return this.apiClient.post(
      expenseResource.routes.post,
      undefined as never,
      { params: { id } } as never,
    )
  }

  cancel = (id: string): Promise<ApiResponse<typeof expenseResource.routes.cancel, "post">> => {
    return this.apiClient.post(
      expenseResource.routes.cancel,
      undefined as never,
      { params: { id } } as never,
    )
  }
}
