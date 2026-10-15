import { afterEach, describe, expect, it, vi } from "vitest"
import type { components } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { InventoryOpeningBalancesClient } from "./inventory-opening-balances.client"
import { StockBalancesClient } from "./stock-balances.client"

const BALANCE = {
    warehouseId: "w1",
    warehouseName: "Main Warehouse",
    warehouseCode: "WH-001",
    itemId: "i1",
    itemName: "Laptop",
    itemCode: "ITM-001",
    quantity: 50,
    averageCost: 600000,
    updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies components["schemas"]["BalanceResponseDto"]

const REGISTERED = {
    count: 2,
    journalEntryId: "je-1",
} satisfies components["schemas"]["OpeningBalanceRegisteredResponseDto"]

function clientWithResponse(body: unknown, status = 200) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
            new Response(JSON.stringify(body), {
                status,
                headers: { "Content-Type": "application/json" },
            }),
        ),
    )
    return new ApiClient("http://localhost")
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe("inventory and stock clients", () => {
    it("returns a documented stock balance and synthesizes the row id", async () => {
        const client = new StockBalancesClient(
            clientWithResponse({ status: "success", message: "Stock balances retrieved", data: [BALANCE] }),
        )

        const result = await client.list({ warehouseId: "w1" })

        expect(result.data).toEqual([{ ...BALANCE, id: "w1_i1" }])
    })

    it("returns the documented opening-balance payload", async () => {
        const client = new InventoryOpeningBalancesClient(
            clientWithResponse(
                { status: "success", message: "Opening balances registered successfully", data: REGISTERED },
                201,
            ),
        )

        const result = await client.post({
            warehouseId: "w1",
            fiscalPeriodId: "fp1",
            items: [{ itemId: "i1", quantity: 2, unitCost: 10 }],
        })

        expect(result.data).toEqual(REGISTERED)
    })
})
