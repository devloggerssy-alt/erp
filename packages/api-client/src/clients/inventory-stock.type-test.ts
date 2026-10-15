import { describe, expectTypeOf, it } from "vitest"
import type { ApiQueryParams, ApiResponse } from "@devloggers/api-contracts"
import { InventoryOpeningBalancesClient } from "./inventory-opening-balances.client"
import { StockBalancesClient } from "./stock-balances.client"
import { StockCountsClient } from "./stock-counts.client"
import { StockMovementsClient } from "./stock-movements.client"

describe("inventory and stock contract seam", () => {
    it("types every inventory and stock success response", () => {
        type Balances = ApiResponse<"/inventory/balances", "get">
        type Opening = ApiResponse<"/inventory/opening-balances", "post">
        type Movements = ApiResponse<"/stock-ledger/movements", "get">
        type Counts = ApiResponse<"/stock-counts", "get">
        type Count = ApiResponse<"/stock-counts/{id}", "get">
        type Created = ApiResponse<"/stock-counts", "post">
        type Posted = ApiResponse<"/stock-counts/{id}/post", "post">

        expectTypeOf<Balances>().not.toBeUnknown()
        expectTypeOf<Balances>().toHaveProperty("data")
        expectTypeOf<Opening>().not.toBeUnknown()
        expectTypeOf<Opening>().toHaveProperty("data")
        expectTypeOf<Movements>().not.toBeUnknown()
        expectTypeOf<Movements>().toHaveProperty("data")
        expectTypeOf<Counts>().not.toBeUnknown()
        expectTypeOf<Count>().not.toBeUnknown()
        expectTypeOf<Created>().not.toBeUnknown()
        expectTypeOf<Posted>().not.toBeUnknown()
    })

    it("matches query-parameter optionality to the client", () => {
        type BalanceQuery = ApiQueryParams<"/inventory/balances", "get">
        type MovementQuery = ApiQueryParams<"/stock-ledger/movements", "get">
        type CountQuery = ApiQueryParams<"/stock-counts", "get">

        expectTypeOf<BalanceQuery["warehouseId"]>().toEqualTypeOf<string | undefined>()
        expectTypeOf<BalanceQuery["itemId"]>().toEqualTypeOf<string | undefined>()
        expectTypeOf<MovementQuery["warehouseId"]>().toEqualTypeOf<string | undefined>()
        expectTypeOf<MovementQuery["itemId"]>().toEqualTypeOf<string | undefined>()
        expectTypeOf<MovementQuery["movementType"]>().toEqualTypeOf<string | undefined>()
        expectTypeOf<MovementQuery["page"]>().toEqualTypeOf<number | undefined>()
        expectTypeOf<MovementQuery["limit"]>().toEqualTypeOf<number | undefined>()
        expectTypeOf<CountQuery["page"]>().toEqualTypeOf<number | undefined>()
        expectTypeOf<CountQuery["limit"]>().toEqualTypeOf<number | undefined>()
    })

    it("returns generated response fields instead of local mirrors", () => {
        type Balance = NonNullable<Awaited<ReturnType<StockBalancesClient["list"]>>["data"]>[number]
        type Movement = NonNullable<Awaited<ReturnType<StockMovementsClient["list"]>>["data"]>[number]
        type Count = NonNullable<Awaited<ReturnType<StockCountsClient["show"]>>["data"]>
        type Registered = NonNullable<Awaited<ReturnType<InventoryOpeningBalancesClient["post"]>>["data"]>

        expectTypeOf<Balance>().toHaveProperty("warehouseCode")
        expectTypeOf<Balance>().toHaveProperty("id")
        expectTypeOf<Balance["quantity"]>().toEqualTypeOf<number>()
        expectTypeOf<Movement>().toHaveProperty("movementType")
        expectTypeOf<Movement>().toHaveProperty("unitCost")
        expectTypeOf<Count>().toHaveProperty("status")
        expectTypeOf<Count>().toHaveProperty("lines")
        expectTypeOf<Registered>().toEqualTypeOf<{ count: number; journalEntryId: string | null }>()
    })
})
