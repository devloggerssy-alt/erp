import { unitResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class UnitsClient extends CrudClient<typeof unitResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, unitResource)
  }
}