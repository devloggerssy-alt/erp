import { inventoryResource } from "@devloggers/api-contracts"
import type { ApiRequestBody } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

type PostBody = ApiRequestBody<typeof inventoryResource.routes.openingBalances, "post">

export class InventoryOpeningBalancesClient implements ICrudClient {
  key = `${inventoryResource.key}-opening`

  constructor(private readonly apiClient: ApiClient) {}

  async post(dto: PostBody) {
    const result = await this.apiClient.post(inventoryResource.routes.openingBalances, dto)
    return { data: result.data }
  }

  list(): Promise<{ data?: unknown[]; meta?: unknown }> {
    return Promise.resolve({})
  }

  show(_id: string): Promise<{ data?: unknown }> {
    return Promise.resolve({})
  }

  create(_body: unknown): Promise<unknown> {
    return Promise.resolve({})
  }

  update(_id: string, _body: unknown): Promise<unknown> {
    return Promise.resolve({})
  }

  destroy(_id: string): Promise<unknown> {
    return Promise.resolve({})
  }
}
