import { currencyResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class CurrenciesClient extends CrudClient<typeof currencyResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, currencyResource)
  }
}
