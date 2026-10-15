import { expenseResource } from "@devloggers/api-contracts"
import type { ApiResponse } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class ExpensesClient extends CrudClient<typeof expenseResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, expenseResource)
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
