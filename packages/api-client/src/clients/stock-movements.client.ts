import { stockLedgerResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export type StockMovementItem = {
    id: string
    warehouseId: string
    warehouseName: string | null
    itemId: string
    itemName: string | null
    itemCode: string | null
    fiscalPeriodId: string
    fiscalPeriodName?: string
    movementType: string
    quantity: number
    unitCost: number
    referenceType: string | null
    referenceId: string | null
    notes: string | null
    createdAt: string
}

export class StockMovementsClient implements ICrudClient {
    key = stockLedgerResource.key

    constructor(private readonly apiClient: ApiClient) {}

    async list(query?: Record<string, unknown>): Promise<{ data?: StockMovementItem[]; meta?: unknown }> {
        const result = await this.apiClient.get(
            stockLedgerResource.routes.movements,
            query ? ({ query } as never) : undefined,
        ) as { data?: StockMovementItem[]; meta?: unknown }
        return {
            data: result?.data ?? [],
            meta: result?.meta,
        }
    }

    show(_id: string): Promise<{ data?: StockMovementItem }> {
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
