import { dashboardResource } from "@devloggers/api-contracts"
import type { ApiComponents, ApiResponse } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { DateRangeFilter } from "./reports.client"

type DashboardResponse<Route extends typeof dashboardResource.routes[keyof typeof dashboardResource.routes]> =
    ApiResponse<Route, "get">

type DashboardData<Route extends typeof dashboardResource.routes[keyof typeof dashboardResource.routes]> =
    NonNullable<DashboardResponse<Route>["data"]>

export type DashboardCashbox = ApiComponents["schemas"]["DashboardCashboxDto"]
export type DashboardSummaryResponse = ApiComponents["schemas"]["DashboardSummaryResponseDto"]
export type DashboardChartPoint = ApiComponents["schemas"]["DashboardChartPointDto"]
export type DashboardExpenseBreakdownItem = ApiComponents["schemas"]["DashboardExpenseBreakdownItemDto"]
export type DashboardTopItem = ApiComponents["schemas"]["DashboardTopItemDto"]

const EMPTY_SUMMARY: DashboardSummaryResponse = {
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashboxes: [],
    lowStockItemsCount: 0,
    totalActiveItems: 0,
    totalActiveParties: 0,
}

function definedQuery(filters?: DateRangeFilter): { from?: string; to?: string } {
    const query: { from?: string; to?: string } = {}
    if (filters?.from) query.from = filters.from
    if (filters?.to) query.to = filters.to
    return query
}

export class DashboardClient {
    constructor(private readonly apiClient: ApiClient) {}

    async summary(filters?: DateRangeFilter): Promise<DashboardData<typeof dashboardResource.routes.summary>> {
        const query = definedQuery(filters)
        const res = await this.apiClient.get(
            dashboardResource.routes.summary,
            Object.keys(query).length ? { query } : undefined,
        )
        return res.data ?? EMPTY_SUMMARY
    }

    async chartData(filters?: DateRangeFilter): Promise<DashboardData<typeof dashboardResource.routes.chartData>> {
        const query = definedQuery(filters)
        const res = await this.apiClient.get(
            dashboardResource.routes.chartData,
            Object.keys(query).length ? { query } : undefined,
        )
        return res.data ?? []
    }

    async expenseBreakdown(filters?: DateRangeFilter): Promise<DashboardData<typeof dashboardResource.routes.expenseBreakdown>> {
        const query = definedQuery(filters)
        const res = await this.apiClient.get(
            dashboardResource.routes.expenseBreakdown,
            Object.keys(query).length ? { query } : undefined,
        )
        return res.data ?? []
    }

    async topItems(filters?: DateRangeFilter & { limit?: number }): Promise<DashboardData<typeof dashboardResource.routes.topItems>> {
        const query: { from?: string; to?: string; limit?: string } = definedQuery(filters)
        if (filters?.limit != null) query.limit = String(filters.limit)
        const res = await this.apiClient.get(
            dashboardResource.routes.topItems,
            Object.keys(query).length ? { query } : undefined,
        )
        return res.data ?? []
    }
}
