import { fiscalPeriodResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class FiscalPeriodsClient extends CrudClient<typeof fiscalPeriodResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, fiscalPeriodResource)
  }
}
