import { stockCountResource } from "@devloggers/api-contracts"
import type { ApiQueryParams, ApiRequestBody } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { unsupportedOperation, type ICrudClient } from "../infra/crud-client"

type CountQuery = ApiQueryParams<typeof stockCountResource.routes.list, "get">
type CreateBody = ApiRequestBody<typeof stockCountResource.routes.create, "post">

/**
 * Stock counts use the non-standard `details` route (not `show`) and expose
 * create + post but no update/delete. `list`, `show`, `create` and `post` are
 * typed from their generated routes; `update`/`destroy` reject with `never`
 * instead of erasing to `unknown`.
 */
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

    show(id: string) {
        return this.apiClient.get(stockCountResource.routes.details, { params: { id } })
    }

    create(body: CreateBody) {
        return this.apiClient.post(stockCountResource.routes.create, body)
    }

    update(_id: string, _body: unknown): Promise<never> {
        return unsupportedOperation(this.key, "update")
    }

    destroy(_id: string): Promise<never> {
        return unsupportedOperation(this.key, "destroy")
    }

    post(id: string) {
        return this.apiClient.post(stockCountResource.routes.post, undefined, { params: { id } })
    }
}
