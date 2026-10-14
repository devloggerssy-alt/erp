import { financialSettingResource } from "@devloggers/api-contracts"
import type { ApiResponse, UpsertFinancialSettingDto } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export class FinancialSettingClient {
    readonly key = financialSettingResource.key

    constructor(private readonly apiClient: ApiClient) { }

    get = (): Promise<ApiResponse<typeof financialSettingResource.routes.get, "get">> =>
        this.apiClient.get(financialSettingResource.routes.get)

    upsert = (
        dto: UpsertFinancialSettingDto,
    ): Promise<ApiResponse<typeof financialSettingResource.routes.upsert, "patch">> =>
        this.apiClient.patch(financialSettingResource.routes.upsert, dto)
}
