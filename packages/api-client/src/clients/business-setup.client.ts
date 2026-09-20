import type { ApiPathByMethod, ApiRequestBody, ApiResponse } from "@devloggers/api-contracts"
import { businessSetupResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export class BusinessSetupClient {
    constructor(private readonly apiClient: ApiClient) {}

    getState = (): Promise<ApiResponse<typeof businessSetupResource.routes.state, "get">> => {
        return this.apiClient.get(businessSetupResource.routes.state)
    }

    getPlan = (): Promise<ApiResponse<typeof businessSetupResource.routes.plan, "get">> => {
        return this.apiClient.get(businessSetupResource.routes.plan)
    }

    setProfile = (
        body: ApiRequestBody<typeof businessSetupResource.routes.profile, "post">,
    ): Promise<ApiResponse<typeof businessSetupResource.routes.profile, "post">> => {
        return this.apiClient.post(businessSetupResource.routes.profile, body)
    }

    executeTask = (
        type: string,
        body: ApiRequestBody<typeof businessSetupResource.routes.updateTask, "patch">,
    ): Promise<ApiResponse<typeof businessSetupResource.routes.updateTask, "patch">> => {
        return this.apiClient.patch(
            businessSetupResource.routes.updateTask,
            body,
            { params: { type } } as never,
        )
    }

    skipTask = (
        type: string,
    ): Promise<ApiResponse<typeof businessSetupResource.routes.skipTask, "post">> => {
        const route = businessSetupResource.routes.skipTask as ApiPathByMethod<"post">
        return this.apiClient.post(route, undefined as never, { params: { type } } as never)
    }
}
