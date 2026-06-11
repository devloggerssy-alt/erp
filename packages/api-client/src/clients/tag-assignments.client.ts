import { tagAssignmentResource } from "@devloggers/api-contracts"
import type { ApiPathByMethod } from "@devloggers/api-contracts"
import type { CreateTagAssignmentDto, TagAssignmentResponseDto } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export class TagAssignmentsClient {
    readonly key = tagAssignmentResource.key

    constructor(private readonly apiClient: ApiClient) {}

    list = async (query?: { entityType?: string; entityId?: string }): Promise<TagAssignmentResponseDto[]> => {
        const route = tagAssignmentResource.routes.list as ApiPathByMethod<"get">
        return this.apiClient.get(route, query ? { query } as never : undefined) as any
    }

    create = async (body: CreateTagAssignmentDto): Promise<TagAssignmentResponseDto> => {
        const route = tagAssignmentResource.routes.create as ApiPathByMethod<"post">
        return this.apiClient.post(route, body as never) as any
    }

    destroy = async (id: string): Promise<void> => {
        const route = tagAssignmentResource.routes.delete as ApiPathByMethod<"delete">
        return this.apiClient.delete(route, { params: { id } } as never) as any
    }
}
