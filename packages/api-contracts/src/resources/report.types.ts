/**
 * Response shapes for the `/reports/*` endpoints.
 *
 * These are the source of truth for the API presenters and the api-client
 * types. Decimal fields are always presented as numbers, and dates as ISO
 * strings, so consumers never see Prisma value objects.
 */

export type StockBalanceReportItem = {
  itemId: string
  itemName: string
  itemCode: string
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  quantity: number
  averageCost: number
  updatedAt: string
}

export type InvoiceReportItem = {
  id: string
  number: string
  date: string
  total: number
  partyId: string
  party: { name: string; code: string | null } | null
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

export type PartyStatementParty = {
  id: string
  name: string
  code: string | null
}

export type PartyStatementPayment = {
  id: string
  date: string
  amount: number
}

export type PartyStatementResponse = {
  party: PartyStatementParty | null
  invoices: InvoiceReportItem[]
  payments: PartyStatementPayment[]
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
