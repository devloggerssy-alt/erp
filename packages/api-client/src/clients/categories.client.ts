import { itemCategoryResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class CategoriesClient extends CrudClient<typeof itemCategoryResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, itemCategoryResource)
  }
}