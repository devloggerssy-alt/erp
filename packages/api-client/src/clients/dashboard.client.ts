import { ApiClient } from "../infra/client"
import type { DateRangeFilter } from "./reports.client"

export type DashboardCashbox = {
    id: string
    code: string
    name: Record<string, string>
    balance: string
    currency: { code: string; symbol: string }
}

export type DashboardSummaryResponse = {
    totalSales: number
    totalPurchases: number
    totalExpenses: number
    netProfit: number
    cashboxes: DashboardCashbox[]
    lowStockItemsCount: number
    totalActiveItems: number
    totalActiveParties: number
}

export type DashboardChartPoint = {
    date: string
    sales: number
    purchases: number
}

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

export class DashboardClient {
    constructor(private readonly apiClient: ApiClient) {}

    async summary(filters?: DateRangeFilter): Promise<DashboardSummaryResponse> {
        const query = filters
            ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
            : undefined
        const res = await this.apiClient.get(
            '/dashboard/summary' as never,
            query ? ({ query } as never) : undefined,
        ) as { data?: DashboardSummaryResponse }
        return res?.data ?? EMPTY_SUMMARY
    }

    async chartData(filters?: DateRangeFilter): Promise<DashboardChartPoint[]> {
        const query = filters
            ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
            : undefined
        const res = await this.apiClient.get(
            '/dashboard/chart-data' as never,
            query ? ({ query } as never) : undefined,
        ) as { data?: DashboardChartPoint[] }
        return res?.data ?? []
    }
}
