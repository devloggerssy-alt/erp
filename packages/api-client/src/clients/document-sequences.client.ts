import { documentSequenceResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class DocumentSequencesClient extends CrudClient<typeof documentSequenceResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, documentSequenceResource)
  }
}
