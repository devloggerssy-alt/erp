import { describe, expectTypeOf, it } from "vitest"
import type { ApiComponents } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { DashboardClient } from "./dashboard.client"
import { ReportsClient } from "./reports.client"

type Schema<K extends keyof ApiComponents["schemas"]> = ApiComponents["schemas"][K]

/**
 * Report and dashboard endpoints declare concrete response schemas in the
 * OpenAPI contract. These assertions pin the client surface to those generated
 * schemas so a hand-written response mirror cannot creep back in.
 */
describe("ReportsClient — generated response types", () => {
    const client = new ReportsClient(new ApiClient("http://localhost"))

    it("stockBalance() resolves the generated row array", () => {
        type Result = Awaited<ReturnType<typeof client.stockBalance>>
        expectTypeOf<Result>().not.toBeAny()
        expectTypeOf<Result>().toEqualTypeOf<Schema<"StockBalanceReportItemDto">[]>()
    })

    it("salesSummary() resolves the generated summary", () => {
        type Result = Awaited<ReturnType<typeof client.salesSummary>>
        expectTypeOf<Result>().not.toBeAny()
        expectTypeOf<Result>().toEqualTypeOf<Schema<"SalesSummaryResponseDto">>()
    })

    it("purchaseSummary() resolves the generated summary", () => {
        type Result = Awaited<ReturnType<typeof client.purchaseSummary>>
        expectTypeOf<Result>().not.toBeAny()
        expectTypeOf<Result>().toEqualTypeOf<Schema<"PurchaseSummaryResponseDto">>()
    })

    it("customerStatement() and supplierStatement() resolve the generated statement", () => {
        type CustomerStatement = Awaited<ReturnType<typeof client.customerStatement>>
        type SupplierStatement = Awaited<ReturnType<typeof client.supplierStatement>>

        expectTypeOf<CustomerStatement>().not.toBeAny()
        expectTypeOf<SupplierStatement>().not.toBeAny()
        expectTypeOf<CustomerStatement>().toEqualTypeOf<Schema<"PartyStatementResponseDto">>()
        expectTypeOf<SupplierStatement>().toEqualTypeOf<Schema<"PartyStatementResponseDto">>()
    })

    it("profitSummary() resolves the generated summary", () => {
        type Result = Awaited<ReturnType<typeof client.profitSummary>>
        expectTypeOf<Result>().not.toBeAny()
        expectTypeOf<Result>().toEqualTypeOf<Schema<"ProfitSummaryResponseDto">>()
    })
})

describe("DashboardClient — generated response types", () => {
    const client = new DashboardClient(new ApiClient("http://localhost"))

    it("summary() resolves the generated summary", () => {
        type Result = Awaited<ReturnType<typeof client.summary>>
        expectTypeOf<Result>().not.toBeAny()
        expectTypeOf<Result>().toEqualTypeOf<Schema<"DashboardSummaryResponseDto">>()
    })

    it("chartData() resolves the generated chart points", () => {
        type Result = Awaited<ReturnType<typeof client.chartData>>
        expectTypeOf<Result>().not.toBeAny()
        expectTypeOf<Result>().toEqualTypeOf<Schema<"DashboardChartPointDto">[]>()
    })

    it("expenseBreakdown() resolves the generated breakdown rows", () => {
        type Result = Awaited<ReturnType<typeof client.expenseBreakdown>>
        expectTypeOf<Result>().not.toBeAny()
        expectTypeOf<Result>().toEqualTypeOf<Schema<"DashboardExpenseBreakdownItemDto">[]>()
    })

    it("topItems() resolves the generated top-item rows", () => {
        type Result = Awaited<ReturnType<typeof client.topItems>>
        expectTypeOf<Result>().not.toBeAny()
        expectTypeOf<Result>().toEqualTypeOf<Schema<"DashboardTopItemDto">[]>()
    })
})
