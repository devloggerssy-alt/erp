import type { ApiPathParams, ApiRequestBody, ApiResponse } from "@devloggers/api-contracts"
import { businessSetupResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { requireResponseData } from "../infra/require-response-data"

type SetupTaskType = ApiPathParams<typeof businessSetupResource.routes.updateTask, "patch">["type"]

type StateData = NonNullable<ApiResponse<typeof businessSetupResource.routes.state, "get">["data"]>
type PlanData = NonNullable<ApiResponse<typeof businessSetupResource.routes.plan, "get">["data"]>
type TaskData = NonNullable<ApiResponse<typeof businessSetupResource.routes.updateTask, "patch">["data"]>

export class BusinessSetupClient {
    constructor(private readonly apiClient: ApiClient) {}

    getState = async (): Promise<StateData> => {
        const res = await this.apiClient.get(businessSetupResource.routes.state)
        return requireResponseData(res.data, "Business setup state response missing")
    }

    getPlan = async (): Promise<PlanData> => {
        const res = await this.apiClient.get(businessSetupResource.routes.plan)
        return requireResponseData(res.data, "Business setup plan response missing")
    }

    setProfile = async (
        body: ApiRequestBody<typeof businessSetupResource.routes.profile, "post">,
    ): Promise<StateData> => {
        const res = await this.apiClient.post(businessSetupResource.routes.profile, body)
        return requireResponseData(res.data, "Business setup profile response missing")
    }

    executeTask = async (
        type: SetupTaskType,
        body: ApiRequestBody<typeof businessSetupResource.routes.updateTask, "patch">,
    ): Promise<TaskData> => {
        const res = await this.apiClient.patch(
            businessSetupResource.routes.updateTask,
            body,
            { params: { type } },
        )
        return requireResponseData(res.data, "Business setup task response missing")
    }

    skipTask = async (type: SetupTaskType): Promise<TaskData> => {
        const res = await this.apiClient.post(
            businessSetupResource.routes.skipTask,
            undefined,
            { params: { type } },
        )
        return requireResponseData(res.data, "Business setup skip response missing")
    }
}
