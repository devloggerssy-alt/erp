import { roleResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class RolesClient extends CrudClient<typeof roleResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, roleResource)
  }
}
