import { customFieldResource } from "@devloggers/api-contracts"
import type { CustomFieldModule, CustomFieldResponseDto } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class CustomFieldsClient extends CrudClient<typeof customFieldResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, customFieldResource)
  }

  listByModule(module: CustomFieldModule): Promise<{ data?: CustomFieldResponseDto[] }> {
    return this.apiClient.get("/custom-fields/by-module", { query: { module } } as never) as Promise<{
      data?: CustomFieldResponseDto[]
    }>
  }
}
