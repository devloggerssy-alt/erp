import { accountResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class AccountsClient extends CrudClient<typeof accountResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, accountResource)
  }
}
