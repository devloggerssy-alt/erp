import { reportResource } from "@devloggers/api-contracts"
import type { ApiComponents, ApiResponse } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

type ReportResponse<Route extends typeof reportResource.routes[keyof typeof reportResource.routes]> =
    ApiResponse<Route, "get">

type ReportData<Route extends typeof reportResource.routes[keyof typeof reportResource.routes]> =
    NonNullable<ReportResponse<Route>["data"]>

export type StockBalanceReportItem = ApiComponents["schemas"]["StockBalanceReportItemDto"]
export type InvoiceReportItem = ApiComponents["schemas"]["InvoiceReportItemDto"]
export type SalesSummaryResponse = ApiComponents["schemas"]["SalesSummaryResponseDto"]
export type PurchaseSummaryResponse = ApiComponents["schemas"]["PurchaseSummaryResponseDto"]
export type PartyStatementParty = ApiComponents["schemas"]["PartyStatementPartyDto"]
export type PartyStatementPayment = ApiComponents["schemas"]["PartyStatementPaymentDto"]
export type PartyStatementResponse = ApiComponents["schemas"]["PartyStatementResponseDto"]
export type ProfitSummaryResponse = ApiComponents["schemas"]["ProfitSummaryResponseDto"]

export type DateRangeFilter = { from?: string; to?: string }
export type SalesSummaryFilter = DateRangeFilter & { partyId?: string }
export type PurchaseSummaryFilter = DateRangeFilter & { partyId?: string }

const EMPTY_SALES: SalesSummaryResponse = { invoices: [], totalSales: 0, count: 0 }
const EMPTY_PURCHASES: PurchaseSummaryResponse = { invoices: [], totalPurchases: 0, count: 0 }
const EMPTY_STATEMENT: PartyStatementResponse = {
    party: null,
    invoices: [],
    payments: [],
    totalInvoiced: 0,
    totalPaid: 0,
    balance: 0,
}
const EMPTY_PROFIT: ProfitSummaryResponse = {
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    grossProfit: 0,
    netProfit: 0,
}

function definedQuery<T extends Record<string, string | undefined>>(filters: T | undefined): { [K in keyof T]?: string } {
    const query: { [K in keyof T]?: string } = {}
    if (!filters) return query
    for (const key of Object.keys(filters) as (keyof T)[]) {
        const value = filters[key]
        if (value) query[key] = value
    }
    return query
}

export class ReportsClient {
    readonly key = reportResource.key

    constructor(private readonly apiClient: ApiClient) {}

    async stockBalance(warehouseId?: string): Promise<ReportData<typeof reportResource.routes.stockBalance>> {
        const res = await this.apiClient.get(
            reportResource.routes.stockBalance,
            warehouseId ? { query: { warehouseId } } : undefined,
        )
        return res.data ?? []
    }

    async salesSummary(filters?: SalesSummaryFilter): Promise<ReportData<typeof reportResource.routes.salesSummary>> {
        const query = definedQuery(filters)
        const res = await this.apiClient.get(
            reportResource.routes.salesSummary,
            Object.keys(query).length ? { query } : undefined,
        )
        return res.data ?? EMPTY_SALES
    }

    async purchaseSummary(filters?: PurchaseSummaryFilter): Promise<ReportData<typeof reportResource.routes.purchaseSummary>> {
        const query = definedQuery(filters)
        const res = await this.apiClient.get(
            reportResource.routes.purchaseSummary,
            Object.keys(query).length ? { query } : undefined,
        )
        return res.data ?? EMPTY_PURCHASES
    }

    async customerStatement(partyId: string): Promise<ReportData<typeof reportResource.routes.customerStatement>> {
        const res = await this.apiClient.get(reportResource.routes.customerStatement, { query: { partyId } })
        return res.data ?? EMPTY_STATEMENT
    }

    async supplierStatement(partyId: string): Promise<ReportData<typeof reportResource.routes.supplierStatement>> {
        const res = await this.apiClient.get(reportResource.routes.supplierStatement, { query: { partyId } })
        return res.data ?? EMPTY_STATEMENT
    }

    async profitSummary(filters?: DateRangeFilter): Promise<ReportData<typeof reportResource.routes.profitSummary>> {
        const query = definedQuery(filters)
        const res = await this.apiClient.get(
            reportResource.routes.profitSummary,
            Object.keys(query).length ? { query } : undefined,
        )
        return res.data ?? EMPTY_PROFIT
    }
}
