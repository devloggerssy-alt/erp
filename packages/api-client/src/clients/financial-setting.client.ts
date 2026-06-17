import { financialSettingResource } from "@devloggers/api-contracts"
import type { UpsertFinancialSettingDto } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export class FinancialSettingClient {
    readonly key = financialSettingResource.key

    constructor(private readonly apiClient: ApiClient) {}

    get = () =>
        this.apiClient.get(financialSettingResource.routes.get as never)

    upsert = (dto: UpsertFinancialSettingDto) =>
        this.apiClient.patch(financialSettingResource.routes.upsert as never, dto as never)
}
