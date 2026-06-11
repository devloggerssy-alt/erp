import { tagResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class TagsClient extends CrudClient<typeof tagResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, tagResource)
  }
}
