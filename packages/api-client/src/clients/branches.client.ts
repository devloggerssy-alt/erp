import { branchResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class BranchesClient extends CrudClient<typeof branchResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, branchResource)
  }
}
