import { itemResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export class ItemsClient implements ICrudClient {
    readonly key = itemResource.key

    constructor(private readonly apiClient: ApiClient) {}

    list = (query?: Record<string, unknown>) =>
        this.apiClient.get(itemResource.routes.list, query ? { query } as never : undefined) as any

    show = (id: string) =>
        this.apiClient.get(itemResource.routes.details as any, { params: { id } } as never) as any

    create = (body: unknown) =>
        this.apiClient.post(itemResource.routes.create, body as never) as any

    update = (id: string, body: unknown) =>
        this.apiClient.patch(itemResource.routes.update as any, body as never, { params: { id } } as never) as any

    destroy = (_id: string): Promise<unknown> => {
        throw new Error("Items cannot be deleted via this client")
    }
}
