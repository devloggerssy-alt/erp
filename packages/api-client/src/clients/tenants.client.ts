import { tenantResource, type ApiRequestBody } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export class TenantsClient {
    constructor(private readonly apiClient: ApiClient) {}

    current = async () => {
        return this.apiClient.get(tenantResource.routes.current)
    }

    updateCurrent = async (
        payload: ApiRequestBody<typeof tenantResource.routes.updateCurrent, "patch">,
    ) => {
        return this.apiClient.patch(tenantResource.routes.updateCurrent, payload)
    }

    getSettings = async () => {
        return this.apiClient.get(tenantResource.routes.settings)
    }

    updateSettings = async (patch: Record<string, unknown>) => {
        return this.apiClient.patch(
            tenantResource.routes.updateSettings,
            patch as ApiRequestBody<typeof tenantResource.routes.updateSettings, "patch">,
        )
    }

    getDefaults = async () => {
        return this.apiClient.get(tenantResource.routes.defaults)
    }

    resetFinance = async (
        payload: ApiRequestBody<typeof tenantResource.routes.resetFinance, "post">,
    ) => {
        return this.apiClient.post(tenantResource.routes.resetFinance, payload)
    }

    resetInventory = async (
        payload: ApiRequestBody<typeof tenantResource.routes.resetInventory, "post">,
    ) => {
        return this.apiClient.post(tenantResource.routes.resetInventory, payload)
    }
}
