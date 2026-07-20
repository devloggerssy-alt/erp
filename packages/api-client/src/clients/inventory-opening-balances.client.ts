import { inventoryResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export type OpeningBalanceItemDto = {
  itemId: string
  quantity: number
  unitCost: number
}

export type PostInventoryOpeningBalanceDto = {
  warehouseId: string
  fiscalPeriodId: string
  items: OpeningBalanceItemDto[]
}

export type InventoryOpeningBalanceResponse = {
  count: number
  warehouseId: string
  journalEntryId: string | null
}

export class InventoryOpeningBalancesClient implements ICrudClient {
  key = `${inventoryResource.key}-opening`

  constructor(private readonly apiClient: ApiClient) {}

  async post(dto: PostInventoryOpeningBalanceDto): Promise<{ data?: InventoryOpeningBalanceResponse }> {
    const result = await this.apiClient.post(
      inventoryResource.routes.openingBalances,
      dto as never,
    ) as { data?: InventoryOpeningBalanceResponse }
    return { data: result?.data }
  }

  list(): Promise<{ data?: unknown[]; meta?: unknown }> {
    return Promise.resolve({})
  }

  show(_id: string): Promise<{ data?: unknown }> {
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
