import type { LocalizedString } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { DateRangeFilter } from "./reports.client"

export type DashboardCashbox = {
    id: string
    code: string
    name: LocalizedString
    balance: string
    currency: { code: string; symbol: LocalizedString | null }
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

export type DashboardExpenseBreakdownItem = {
    accountId: string
    accountName: LocalizedString
    total: number
}

export type DashboardTopItem = {
    itemId: string
    itemName: string
    itemCode: string
    quantity: number
    revenue: number
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

    async expenseBreakdown(filters?: DateRangeFilter): Promise<DashboardExpenseBreakdownItem[]> {
        const query = filters
            ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
            : undefined
        const res = await this.apiClient.get(
            '/dashboard/expense-breakdown' as never,
            query ? ({ query } as never) : undefined,
        ) as { data?: DashboardExpenseBreakdownItem[] }
        return res?.data ?? []
    }

    async topItems(filters?: DateRangeFilter & { limit?: number }): Promise<DashboardTopItem[]> {
        const query = filters
            ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
            : undefined
        const res = await this.apiClient.get(
            '/dashboard/top-items' as never,
            query ? ({ query } as never) : undefined,
        ) as { data?: DashboardTopItem[] }
        return res?.data ?? []
    }
}
