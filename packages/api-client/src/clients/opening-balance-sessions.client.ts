import { openingBalanceSessionResource, type ApiPathByMethod, type ApiResponse } from "@devloggers/api-contracts"
import { CrudClient } from "../infra/crud-client"
import type { ApiClient } from "../infra/client"

export class OpeningBalanceSessionsClient extends CrudClient<typeof openingBalanceSessionResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, openingBalanceSessionResource)
  }

  async validate(id: string): Promise<unknown> {
    const route = this.resource.routes.validate as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }

  async review(id: string): Promise<unknown> {
    const route = this.resource.routes.review as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }

  async post(id: string): Promise<unknown> {
    const route = this.resource.routes.post as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }

  async lock(id: string): Promise<unknown> {
    const route = this.resource.routes.lock as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined as never, { params: { id } } as never)
  }

  async preview(id: string): Promise<ApiResponse<typeof openingBalanceSessionResource.routes.preview, "get">> {
    return this.apiClient.get(this.resource.routes.preview, { params: { id } } as never)
  }
}