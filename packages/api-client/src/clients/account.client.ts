// packages/api-client/src/clients/account.client.ts
import { accountResource } from "@devloggers/api-contracts"
import type { ApiResponse } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class AccountsClient extends CrudClient<typeof accountResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, accountResource)
  }

  /**
   * Uses `accountResource.routes.X` directly (no cast). Casting it to the wider
   * `ApiPathByMethod<"get">` here would erase the literal path type and collapse
   * the return type for every caller — see Task 0 of the Phase 4 plan for the
   * verified repro. The explicit return-type annotation below is defense in
   * depth: it stays correct even if a future edit reintroduces a widening cast
   * inside the method body.
   */
  balances = (): Promise<ApiResponse<typeof accountResource.routes.balances, "get">> => {
    return this.apiClient.get(accountResource.routes.balances)
  }

  tree = (): Promise<ApiResponse<typeof accountResource.routes.tree, "get">> => {
    return this.apiClient.get(accountResource.routes.tree)
  }

  ledger = (
    id: string,
    query?: { page?: number; limit?: number },
  ): Promise<ApiResponse<typeof accountResource.routes.ledger, "get">> => {
    // query shape differs from ApiQueryParams<Path, "get"> — narrow cast on value only
    return this.apiClient.get(accountResource.routes.ledger, { params: { id }, query: query as never })
  }
}
