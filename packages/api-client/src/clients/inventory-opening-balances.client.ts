import { inventoryResource } from "@devloggers/api-contracts"
import type { ApiRequestBody } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { unsupportedOperation, type ICrudClient } from "../infra/crud-client"

type PostBody = ApiRequestBody<typeof inventoryResource.routes.openingBalances, "post">

/**
 * Action-only client for the opening-balances endpoint. The API exposes a
 * single POST route and no list/show/create/update/delete; those operations
 * reject with `never` rather than resolving to a fake empty body. `post` is
 * typed from the route's generated request/response.
 */
export class InventoryOpeningBalancesClient implements ICrudClient {
  key = `${inventoryResource.key}-opening`

  constructor(private readonly apiClient: ApiClient) {}

  async post(dto: PostBody) {
    return this.apiClient.post(inventoryResource.routes.openingBalances, dto)
  }

  list(): Promise<never> {
    return unsupportedOperation(this.key, "list")
  }

  show(_id: string): Promise<never> {
    return unsupportedOperation(this.key, "show")
  }

  create(_body: unknown): Promise<never> {
    return unsupportedOperation(this.key, "create")
  }

  update(_id: string, _body: unknown): Promise<never> {
    return unsupportedOperation(this.key, "update")
  }

  destroy(_id: string): Promise<never> {
    return unsupportedOperation(this.key, "destroy")
  }
}
