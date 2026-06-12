import { itemCatalogEntityResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class ItemCatalogEntitiesClient extends CrudClient<typeof itemCatalogEntityResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, itemCatalogEntityResource)
  }
}
