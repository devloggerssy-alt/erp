import { partyResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class PartiesClient extends CrudClient<typeof partyResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, partyResource)
  }
}
