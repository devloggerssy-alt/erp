import { itemRelationResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class ItemRelationsClient extends CrudClient<typeof itemRelationResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, itemRelationResource)
  }
}
