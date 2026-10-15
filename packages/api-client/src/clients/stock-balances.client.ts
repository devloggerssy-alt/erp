import { inventoryResource } from "@devloggers/api-contracts"
import type { ApiQueryParams } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

type BalanceQuery = ApiQueryParams<typeof inventoryResource.routes.balances, "get">

export class StockBalancesClient implements ICrudClient {
    key = inventoryResource.key

    constructor(private readonly apiClient: ApiClient) {}

    async list(query?: BalanceQuery) {
        const result = await this.apiClient.get(
            inventoryResource.routes.balances,
            query ? { query } : undefined,
        )
        return {
            data: (result.data ?? []).map((item) => ({
                ...item,
                id: `${item.warehouseId}_${item.itemId}`,
            })),
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
