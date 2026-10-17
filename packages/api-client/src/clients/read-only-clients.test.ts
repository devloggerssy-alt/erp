import { describe, expect, it } from "vitest"
import { ApiClient } from "../infra/client"
import { unsupportedOperation } from "../infra/crud-client"
import { InventoryOpeningBalancesClient } from "./inventory-opening-balances.client"
import { StockBalancesClient } from "./stock-balances.client"
import { StockCountsClient } from "./stock-counts.client"
import { StockMovementsClient } from "./stock-movements.client"

/**
 * Read-only / action-only resources have no route for these operations. They
 * must reject rather than resolve a fake empty body, so a caller can never
 * mistake an unsupported call for a successful one.
 */
describe("read-only clients reject unsupported operations", () => {
    const apiClient = new ApiClient("http://localhost")

    it("unsupportedOperation rejects with the resource and operation named", async () => {
        await expect(unsupportedOperation("stock-balances", "destroy")).rejects.toThrow(
            'Resource "stock-balances" does not support destroy',
        )
    })

    it("stock balances rejects show/create/update/destroy", async () => {
        const client = new StockBalancesClient(apiClient)
        await expect(client.show("x")).rejects.toThrow(/does not support show/)
        await expect(client.create({})).rejects.toThrow(/does not support create/)
        await expect(client.update("x", {})).rejects.toThrow(/does not support update/)
        await expect(client.destroy("x")).rejects.toThrow(/does not support destroy/)
    })

    it("stock movements rejects show/destroy", async () => {
        const client = new StockMovementsClient(apiClient)
        await expect(client.show("x")).rejects.toThrow(/does not support show/)
        await expect(client.destroy("x")).rejects.toThrow(/does not support destroy/)
    })

    it("stock counts rejects update/destroy but keeps create/show/post", async () => {
        const client = new StockCountsClient(apiClient)
        expect(client.create).toBeTypeOf("function")
        expect(client.show).toBeTypeOf("function")
        expect(client.post).toBeTypeOf("function")
        await expect(client.update("x", {})).rejects.toThrow(/does not support update/)
        await expect(client.destroy("x")).rejects.toThrow(/does not support destroy/)
    })

    it("inventory opening balances rejects list/show/create/update/destroy", async () => {
        const client = new InventoryOpeningBalancesClient(apiClient)
        await expect(client.list()).rejects.toThrow(/does not support list/)
        await expect(client.show("x")).rejects.toThrow(/does not support show/)
        await expect(client.destroy("x")).rejects.toThrow(/does not support destroy/)
    })
})
