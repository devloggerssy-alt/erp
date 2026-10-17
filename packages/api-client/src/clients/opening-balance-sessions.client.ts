import { openingBalanceSessionResource, type ApiResponse } from "@devloggers/api-contracts"
import { CrudClient } from "../infra/crud-client"
import type { ApiClient } from "../infra/client"

/**
 * Opening-balance sessions add lifecycle action routes on top of standard CRUD.
 * Each action is typed from its own generated route, so callers read the
 * documented payload instead of the erased `unknown`.
 */
export class OpeningBalanceSessionsClient extends CrudClient<typeof openingBalanceSessionResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, openingBalanceSessionResource)
  }

  validate(id: string): Promise<ApiResponse<typeof openingBalanceSessionResource.routes.validate, "post">> {
    return this.apiClient.post(openingBalanceSessionResource.routes.validate, undefined, { params: { id } })
  }

  review(id: string): Promise<ApiResponse<typeof openingBalanceSessionResource.routes.review, "post">> {
    return this.apiClient.post(openingBalanceSessionResource.routes.review, undefined, { params: { id } })
  }

  post(id: string): Promise<ApiResponse<typeof openingBalanceSessionResource.routes.post, "post">> {
    return this.apiClient.post(openingBalanceSessionResource.routes.post, undefined, { params: { id } })
  }

  lock(id: string): Promise<ApiResponse<typeof openingBalanceSessionResource.routes.lock, "post">> {
    return this.apiClient.post(openingBalanceSessionResource.routes.lock, undefined, { params: { id } })
  }

  preview(id: string): Promise<ApiResponse<typeof openingBalanceSessionResource.routes.preview, "get">> {
    return this.apiClient.get(openingBalanceSessionResource.routes.preview, { params: { id } })
  }
}
