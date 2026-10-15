import { stockLedgerResource } from "@devloggers/api-contracts"
import type { ApiQueryParams } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

type MovementQuery = ApiQueryParams<typeof stockLedgerResource.routes.movements, "get">

export class StockMovementsClient implements ICrudClient {
    key = stockLedgerResource.key

    constructor(private readonly apiClient: ApiClient) {}

    async list(query?: MovementQuery) {
        const result = await this.apiClient.get(
            stockLedgerResource.routes.movements,
            query ? { query } : undefined,
        )
        return {
            data: result.data ?? [],
            meta: result.meta,
        }
    }

    show(_id: string): Promise<{ data?: never }> {
        return Promise.resolve({})
    }

    create(_body: unknown): Promise<unknown> {
        return Promise.resolve({})
    }

    update(_id: string, _body: unknown): Promise<unknown> {
        return Promise.resolve({})
    }

    destroy(_id: string): Promise<unknown> {
        return Promise.resolve({})
    }
}
