import { accountResource } from "@devloggers/api-contracts"
import type { ApiPathByMethod } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class AccountsClient extends CrudClient<typeof accountResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, accountResource)
  }

  balances = () => {
    const route = accountResource.routes.balances as ApiPathByMethod<"get">
    return this.apiClient.get(route)
  }

  ledger = (id: string, query?: { page?: number; limit?: number }) => {
    const route = accountResource.routes.ledger as ApiPathByMethod<"get">
    return this.apiClient.get(route, { params: { id }, query } as never)
  }
}
