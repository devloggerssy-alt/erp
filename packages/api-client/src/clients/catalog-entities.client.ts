import { catalogEntityResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class CatalogEntitiesClient extends CrudClient<typeof catalogEntityResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, catalogEntityResource)
  }
}
