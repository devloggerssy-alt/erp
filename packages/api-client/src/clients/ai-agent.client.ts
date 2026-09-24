import { aiResource, type ApiQueryParams, type ApiRequestBody, type ApiResponse } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export type ChatRequestBody = ApiRequestBody<typeof aiResource.routes.chat, "post">

export class AiAgentClient {
    constructor(private readonly apiClient: ApiClient) {}

    listConversations = (
        query?: ApiQueryParams<typeof aiResource.routes.conversations, "get">,
    ): Promise<ApiResponse<typeof aiResource.routes.conversations, "get">> =>
        this.apiClient.get(aiResource.routes.conversations, { query })

    createConversation = (
        body: ApiRequestBody<typeof aiResource.routes.conversations, "post">,
    ): Promise<ApiResponse<typeof aiResource.routes.conversations, "post">> =>
        this.apiClient.post(aiResource.routes.conversations, body)

    renameConversation = (
        id: string,
        body: ApiRequestBody<typeof aiResource.routes.conversation, "patch">,
    ): Promise<ApiResponse<typeof aiResource.routes.conversation, "patch">> =>
        this.apiClient.patch(aiResource.routes.conversation, body, { params: { id } })

    deleteConversation = (id: string): Promise<ApiResponse<typeof aiResource.routes.conversation, "delete">> =>
        this.apiClient.delete(aiResource.routes.conversation, { params: { id } })

    listMessages = (
        id: string,
        query?: ApiQueryParams<typeof aiResource.routes.messages, "get">,
    ): Promise<ApiResponse<typeof aiResource.routes.messages, "get">> =>
        this.apiClient.get(aiResource.routes.messages, { params: { id }, query })

    /** Target for the AI SDK chat transport (SSE is not a typed JSON call). */
    chatTarget = (id: string): { url: string; headers: Record<string, string> } =>
        this.apiClient.resolveRequestTarget(aiResource.routes.chat.replace("{id}", encodeURIComponent(id)))
}
