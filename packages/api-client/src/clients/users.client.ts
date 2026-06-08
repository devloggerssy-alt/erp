import { userResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class UsersClient extends CrudClient<typeof userResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, userResource)
  }
}
