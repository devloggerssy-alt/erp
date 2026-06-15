import { inventoryResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export type StockBalanceItem = {
    id: string
    warehouseId: string
    warehouseName: string
    warehouseCode: string
    itemId: string
    itemName: string
    itemCode: string
    quantity: number
    averageCost: number
    updatedAt: string
}

export class StockBalancesClient implements ICrudClient {
    key = inventoryResource.key

    constructor(private readonly apiClient: ApiClient) {}

    async list(query?: Record<string, unknown>): Promise<{ data?: StockBalanceItem[]; meta?: unknown }> {
        const result = await this.apiClient.get(
            inventoryResource.routes.balances,
            query ? ({ query } as never) : undefined,
        ) as { data?: Record<string, unknown>[] }
        const raw = result?.data ?? []
        return {
            data: raw.map((item) => ({
                ...item,
                id: `${item.warehouseId}_${item.itemId}`,
            })) as StockBalanceItem[],
        }
    }

    show(_id: string): Promise<{ data?: StockBalanceItem }> {
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
