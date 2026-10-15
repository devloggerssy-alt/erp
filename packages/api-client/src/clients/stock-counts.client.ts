import { stockCountResource } from "@devloggers/api-contracts"
import type { ApiQueryParams, ApiRequestBody } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

type CountQuery = ApiQueryParams<typeof stockCountResource.routes.list, "get">
type CreateBody = ApiRequestBody<typeof stockCountResource.routes.create, "post">

export class StockCountsClient implements ICrudClient {
    key = stockCountResource.key

    constructor(private readonly apiClient: ApiClient) {}

    async list(query?: CountQuery) {
        const result = await this.apiClient.get(
            stockCountResource.routes.list,
            query ? { query } : undefined,
        )
        return {
            data: result.data ?? [],
            meta: result.meta,
        }
    }

    async show(id: string) {
        const result = await this.apiClient.get(stockCountResource.routes.details, { params: { id } })
        return { data: result.data }
    }

    async create(body: CreateBody) {
        return this.apiClient.post(stockCountResource.routes.create, body)
    }

    update(_id: string, _body: unknown): Promise<unknown> {
        return Promise.resolve({})
    }

    destroy(_id: string): Promise<unknown> {
        return Promise.resolve({})
    }

    async post(id: string) {
        return this.apiClient.post(stockCountResource.routes.post, undefined, { params: { id } })
    }
}
