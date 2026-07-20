import { accountOpeningBalanceResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient } from "../infra/crud-client"

export type AccountOpeningBalanceEntry = {
  accountId: string
  amount: number
}

export type PostAccountOpeningBalanceDto = {
  fiscalPeriodId: string
  entries: AccountOpeningBalanceEntry[]
}

export type AccountOpeningBalanceResponse = {
  journalEntryId: string
  entriesCount: number
}

export class AccountOpeningBalancesClient implements ICrudClient {
  key = accountOpeningBalanceResource.key

  constructor(private readonly apiClient: ApiClient) {}

  async post(dto: PostAccountOpeningBalanceDto): Promise<{ data?: AccountOpeningBalanceResponse }> {
    const result = await this.apiClient.post(
      accountOpeningBalanceResource.routes.post,
      dto as never,
    ) as { data?: AccountOpeningBalanceResponse }
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
