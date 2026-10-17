import { describe, expectTypeOf, it } from "vitest"
import type { ApiComponents, ApiResponse } from "@devloggers/api-contracts"
import { openingBalanceSessionResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { CrudListDataItem, CrudShowResponse } from "../infra/crud-client"
import { ExpensesClient } from "./expenses.client"
import { InvoicesClient } from "./invoices.client"
import { PaymentsClient } from "./payments.client"
import { StockBalancesClient } from "./stock-balances.client"
import { StockMovementsClient } from "./stock-movements.client"
import { StockCountsClient } from "./stock-counts.client"
import { InventoryOpeningBalancesClient } from "./inventory-opening-balances.client"
import { OpeningBalanceSessionsClient } from "./opening-balance-sessions.client"

type Schema<K extends keyof ApiComponents["schemas"]> = ApiComponents["schemas"][K]

/**
 * The non-standard clients (detail/action routes instead of a full
 * update/delete CRUD surface) must resolve their list rows and detail payloads
 * to the generated response types, so dashboard rows derive from the client
 * instead of a hand-written mirror.
 *
 * Row types here are exactly what `ResourceItem<TClient>` (dashboard) resolves
 * to: `CrudListDataItem<TClient>`.
 */
describe("non-standard clients — resolved row types", () => {
    const api = new ApiClient("http://localhost")

    it("stock balances rows resolve real balance fields", () => {
        type Row = CrudListDataItem<StockBalancesClient>
        expectTypeOf<Row>().not.toBeAny()
        expectTypeOf<Row>().toHaveProperty("warehouseId")
        expectTypeOf<Row>().toHaveProperty("warehouseName")
        expectTypeOf<Row>().toHaveProperty("itemId")
        expectTypeOf<Row>().toHaveProperty("itemName")
        expectTypeOf<Row>().toHaveProperty("quantity")
        expectTypeOf<Row>().toHaveProperty("averageCost")
        expectTypeOf<Row>().toMatchTypeOf<Schema<"BalanceResponseDto">>()
        expectTypeOf<Row>().not.toEqualTypeOf<{ id: string }>()
    })

    it("stock movement rows resolve real movement fields, including referenceId", () => {
        type Row = CrudListDataItem<StockMovementsClient>
        expectTypeOf<Row>().not.toBeAny()
        expectTypeOf<Row>().toHaveProperty("movementType")
        expectTypeOf<Row>().toHaveProperty("referenceType")
        expectTypeOf<Row>().toHaveProperty("referenceId")
        expectTypeOf<Row>().toHaveProperty("unitCost")
        expectTypeOf<Row>().toMatchTypeOf<Schema<"StockMovementResponseDto">>()
        expectTypeOf<Row>().not.toEqualTypeOf<{ id: string }>()
    })

    it("stock count rows resolve real count fields", () => {
        type Row = CrudListDataItem<StockCountsClient>
        expectTypeOf<Row>().not.toBeAny()
        expectTypeOf<Row>().toHaveProperty("number")
        expectTypeOf<Row>().toHaveProperty("status")
        expectTypeOf<Row>().toMatchTypeOf<Schema<"StockCountResponseDto">>()
        expectTypeOf<Row>().not.toEqualTypeOf<{ id: string }>()
    })

    it("stock count show() resolves the generated detail payload", () => {
        expectTypeOf<CrudShowResponse<StockCountsClient>["data"]>().toEqualTypeOf<
            Schema<"StockCountResponseDto"> | undefined
        >()
    })

    it("read-only stock clients answer unsupported operations with `never`", () => {
        expectTypeOf<Awaited<ReturnType<StockBalancesClient["show"]>>>().toBeNever()
        expectTypeOf<Awaited<ReturnType<StockBalancesClient["create"]>>>().toBeNever()
        expectTypeOf<Awaited<ReturnType<StockMovementsClient["destroy"]>>>().toBeNever()
        expectTypeOf<Awaited<ReturnType<StockCountsClient["update"]>>>().toBeNever()
        expectTypeOf<Awaited<ReturnType<InventoryOpeningBalancesClient["list"]>>>().toBeNever()
    })

    it("inventory opening balances post() resolves the generated registration payload", () => {
        const client = new InventoryOpeningBalancesClient(api)
        type Registered = NonNullable<Awaited<ReturnType<typeof client.post>>["data"]>
        expectTypeOf<Registered>().toEqualTypeOf<Schema<"OpeningBalanceRegisteredResponseDto">>()
    })

    it("opening-balance session actions resolve their generated responses", () => {
        const client = new OpeningBalanceSessionsClient(api)
        expectTypeOf<Awaited<ReturnType<typeof client.validate>>>().toEqualTypeOf<
            ApiResponse<typeof openingBalanceSessionResource.routes.validate, "post">
        >()
        expectTypeOf<Awaited<ReturnType<typeof client.post>>>().toEqualTypeOf<
            ApiResponse<typeof openingBalanceSessionResource.routes.post, "post">
        >()
        expectTypeOf<Awaited<ReturnType<typeof client.preview>>>().toEqualTypeOf<
            ApiResponse<typeof openingBalanceSessionResource.routes.preview, "get">
        >()
    })

    it("expense rows and show payload derive from the generated schema", () => {
        type Row = CrudListDataItem<ExpensesClient>
        expectTypeOf<Row>().not.toBeAny()
        expectTypeOf<Row>().toHaveProperty("number")
        expectTypeOf<Row>().toHaveProperty("status")
        expectTypeOf<Row>().toHaveProperty("totalAmount")
        expectTypeOf<CrudShowResponse<ExpensesClient>["data"]>().toEqualTypeOf<
            Schema<"ExpenseResponseDto"> | undefined
        >()
    })

    it("invoice rows and show payload derive from the generated schema", () => {
        type Row = CrudListDataItem<InvoicesClient>
        expectTypeOf<Row>().not.toBeAny()
        expectTypeOf<Row>().toHaveProperty("number")
        expectTypeOf<Row>().toHaveProperty("invoiceTypeDirection")
        expectTypeOf<Row>().toHaveProperty("partyName")
        expectTypeOf<CrudShowResponse<InvoicesClient>["data"]>().toEqualTypeOf<
            Schema<"InvoiceResponseDto"> | undefined
        >()
    })

    it("payment rows and show payload derive from the generated schema", () => {
        type Row = CrudListDataItem<PaymentsClient>
        expectTypeOf<Row>().not.toBeAny()
        expectTypeOf<Row>().toHaveProperty("number")
        expectTypeOf<Row>().toHaveProperty("cashboxName")
        expectTypeOf<Row>().toHaveProperty("amount")
        expectTypeOf<CrudShowResponse<PaymentsClient>["data"]>().toEqualTypeOf<
            Schema<"PaymentResponseDto"> | undefined
        >()
    })
})
