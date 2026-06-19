import { reportResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

// ── Response types ────────────────────────────────────────────────────────────

export type StockBalanceReportItem = {
    itemId: string
    itemName: string | null
    itemCode: string | null
    warehouseId: string
    warehouseName: string | null
    warehouseCode: string | null
    quantity: number
    averageCost: number
    updatedAt: string
}

export type InvoiceReportItem = {
    id: string
    number: string | null
    date: string
    total: number | string
    partyId: string | null
    party?: { name: string; code: string } | null
}

export type SalesSummaryResponse = {
    invoices: InvoiceReportItem[]
    totalSales: number
    count: number
}

export type PurchaseSummaryResponse = {
    invoices: InvoiceReportItem[]
    totalPurchases: number
    count: number
}

export type PartyStatementTransaction = {
    id: string
    date: string
    number?: string | null
    type: "INVOICE" | "PAYMENT"
    amount: number | string
    direction?: string
}

export type PartyStatementResponse = {
    party: { id: string; name: string; code: string } | null
    invoices: InvoiceReportItem[]
    payments: { id: string; date: string; amount: number | string }[]
    totalInvoiced: number
    totalPaid: number
    balance: number
}

export type ProfitSummaryResponse = {
    totalSales: number
    totalPurchases: number
    totalExpenses: number
    grossProfit: number
    netProfit: number
}

// ── Filters ───────────────────────────────────────────────────────────────────

export type DateRangeFilter = { from?: string; to?: string }
export type SalesSummaryFilter = DateRangeFilter & { partyId?: string }
export type PurchaseSummaryFilter = DateRangeFilter & { partyId?: string }

// ── Client ────────────────────────────────────────────────────────────────────

export class ReportsClient {
    readonly key = reportResource.key

    constructor(private readonly apiClient: ApiClient) {}

    async stockBalance(warehouseId?: string): Promise<StockBalanceReportItem[]> {
        const query = warehouseId ? { warehouseId } : undefined
        const res = await this.apiClient.get(
            reportResource.routes.stockBalance,
            query ? ({ query } as never) : undefined,
        ) as { data?: StockBalanceReportItem[] }
        return res?.data ?? []
    }

    async salesSummary(filters?: SalesSummaryFilter): Promise<SalesSummaryResponse> {
        const query = filters ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) : undefined
        const res = await this.apiClient.get(
            reportResource.routes.salesSummary,
            query ? ({ query } as never) : undefined,
        ) as { data?: SalesSummaryResponse }
        return res?.data ?? { invoices: [], totalSales: 0, count: 0 }
    }

    async purchaseSummary(filters?: PurchaseSummaryFilter): Promise<PurchaseSummaryResponse> {
        const query = filters ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) : undefined
        const res = await this.apiClient.get(
            reportResource.routes.purchaseSummary,
            query ? ({ query } as never) : undefined,
        ) as { data?: PurchaseSummaryResponse }
        return res?.data ?? { invoices: [], totalPurchases: 0, count: 0 }
    }

    async customerStatement(partyId: string): Promise<PartyStatementResponse> {
        const res = await this.apiClient.get(
            reportResource.routes.customerStatement,
            { query: { partyId } } as never,
        ) as { data?: PartyStatementResponse }
        return res?.data ?? { party: null, invoices: [], payments: [], totalInvoiced: 0, totalPaid: 0, balance: 0 }
    }

    async supplierStatement(partyId: string): Promise<PartyStatementResponse> {
        const res = await this.apiClient.get(
            reportResource.routes.supplierStatement,
            { query: { partyId } } as never,
        ) as { data?: PartyStatementResponse }
        return res?.data ?? { party: null, invoices: [], payments: [], totalInvoiced: 0, totalPaid: 0, balance: 0 }
    }

    async profitSummary(filters?: DateRangeFilter): Promise<ProfitSummaryResponse> {
        const query = filters ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) : undefined
        const res = await this.apiClient.get(
            reportResource.routes.profitSummary,
            query ? ({ query } as never) : undefined,
        ) as { data?: ProfitSummaryResponse }
        return res?.data ?? { totalSales: 0, totalPurchases: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0 }
    }
}
