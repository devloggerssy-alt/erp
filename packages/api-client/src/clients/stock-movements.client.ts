import { stockLedgerResource } from "@devloggers/api-contracts"
import type { ApiQueryParams } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { unsupportedOperation, type ICrudClient } from "../infra/crud-client"

type MovementQuery = ApiQueryParams<typeof stockLedgerResource.routes.movements, "get">

/**
 * Read-only stock ledger. The API exposes a single movements route
 * (`/stock-ledger/movements`) and no detail/create/update/delete; those
 * operations reject with `never` rather than erasing to `unknown`. `list` is
 * typed from the route's generated response, so `ResourceItem<StockMovementsClient>`
 * resolves the real movement fields (including `referenceId`).
 */
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
