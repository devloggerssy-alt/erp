import { stockCountResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"
import type { CreateStockCountDto } from "@devloggers/api-contracts"

export type StockCountItem = {
    id: string
    number: string
    date: string
    warehouseId: string
    warehouseName?: string
    fiscalPeriodId: string
    status: string
    notes: string | null
    postedAt: string | null
    lineCount?: number
    createdAt: string
    updatedAt: string
}

export class StockCountsClient implements ICrudClient {
    key = stockCountResource.key

    constructor(private readonly apiClient: ApiClient) {}

    async list(query?: Record<string, unknown>): Promise<{ data?: StockCountItem[]; meta?: unknown }> {
        const result = await this.apiClient.get(
            stockCountResource.routes.list,
            query ? ({ query } as never) : undefined,
        ) as { data?: StockCountItem[]; meta?: unknown }
        return {
            data: result?.data ?? [],
            meta: result?.meta,
        }
    }

    async show(id: string): Promise<{ data?: StockCountItem }> {
        const result = await this.apiClient.get(
            stockCountResource.routes.details,
            { params: { id } } as never,
        ) as { data?: StockCountItem }
        return { data: result?.data }
    }

    async create(body: CreateStockCountDto): Promise<unknown> {
        return this.apiClient.post(stockCountResource.routes.create, body as never)
    }

    update(_id: string, _body: unknown): Promise<unknown> {
        return Promise.resolve({})
    }

    destroy(_id: string): Promise<unknown> {
        return Promise.resolve({})
    }

    async post(id: string): Promise<unknown> {
        return this.apiClient.post(
            stockCountResource.routes.post,
            {} as never,
            { params: { id } } as never,
        )
    }
}
