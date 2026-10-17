import { inventoryResource } from "@devloggers/api-contracts"
import type { ApiQueryParams } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { unsupportedOperation, type ICrudClient } from "../infra/crud-client"

type BalanceQuery = ApiQueryParams<typeof inventoryResource.routes.balances, "get">

/**
 * Read-only inventory balances. The API exposes a single list route
 * (`/inventory/balances`) and no detail/create/update/delete; those operations
 * reject with `never` rather than erasing to `unknown` (see
 * `unsupportedOperation`). `list` is typed from the route's generated response,
 * so `ResourceItem<StockBalancesClient>` resolves the real balance fields.
 */
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

    show(_id: string): Promise<never> {
        return unsupportedOperation(this.key, "show")
    }

    create(_body: unknown): Promise<never> {
        return unsupportedOperation(this.key, "create")
    }

    update(_id: string, _body: unknown): Promise<never> {
        return unsupportedOperation(this.key, "update")
    }

    destroy(_id: string): Promise<never> {
        return unsupportedOperation(this.key, "destroy")
    }
}
