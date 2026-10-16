import {
  tagAssignmentResource,
  type ApiQueryParams,
  type ApiRequestBody,
  type ApiResponse,
} from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export class TagAssignmentsClient {
    readonly key = tagAssignmentResource.key

    constructor(private readonly apiClient: ApiClient) {}

    list = (
        query?: ApiQueryParams<typeof tagAssignmentResource.routes.list, "get">,
    ): Promise<ApiResponse<typeof tagAssignmentResource.routes.list, "get">> =>
        this.apiClient.get(tagAssignmentResource.routes.list, { query })

    create = (
        body: ApiRequestBody<typeof tagAssignmentResource.routes.create, "post">,
    ): Promise<ApiResponse<typeof tagAssignmentResource.routes.create, "post">> =>
        this.apiClient.post(tagAssignmentResource.routes.create, body)

    destroy = (id: string): Promise<ApiResponse<typeof tagAssignmentResource.routes.delete, "delete">> =>
        this.apiClient.delete(tagAssignmentResource.routes.delete, { params: { id } })
}
