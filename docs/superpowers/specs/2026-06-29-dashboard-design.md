# Dashboard Page — Design Spec
**Date:** 2026-06-29  
**Status:** Approved  
**Branch:** main

---

## Context

The current `apps/dashboard/modules/home/dashboard-content.tsx` is entirely mock data — hardcoded Arabic strings, fake numbers, and a `useDashboardData` hook that returns an empty object. The backend already has working endpoints (`/dashboard/summary`, `/reports/profit-summary`, `/reports/sales-summary`, `/reports/purchase-summary`) that are not wired to the UI. This spec defines the complete redesign: real API data, date range filtering, per-cashbox balance cards, a live chart, payments movements feed, and full i18n.

---

## Approved Design Decisions

| Question | Decision |
|---|---|
| Date filtering | Full custom date range picker (from/to) |
| Latest movements | Payment movements only (receipts + disbursements) |
| Cashboxes display | One card per active cashbox |
| Quick actions | Navigate to create page (list page with `?action=create` param) |
| Architecture | Approach C: minimal backend additions + parallel frontend queries |

---

## Page Layout (6 Zones)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Page title + Date Range Picker (from / to)     │
├──────────┬──────────┬──────────┬───────────────────────┤
│ Total    │ Total    │ Net      │ Total     (4 KPI cols) │
│ Sales    │ Purchases│ Profit   │ Expenses               │
├─────────────────────────────────────────────────────────┤
│ CASHBOXES: Horizontal scrollable row — one card each    │
│ (name, currency symbol, balance, color accent border)   │
├─────────────────────────────────────────────────────────┤
│ QUICK ACTIONS: 4 large icon buttons (navigate out)      │
│ [Sales Invoice] [Purchase Invoice] [Receipt] [Expense]  │
├──────────────────────────────────────┬──────────────────┤
│  Sales vs Purchases CHART (5/7)      │ Low Stock (2/7)  │
│  AreaChart, day-by-day, date range   │ Top 5 low/zero   │
├──────────────────────┬───────────────┴──────────────────┤
│  Recent Payments     │  Items Overview                  │
│  Table — POSTED,     │  Total / Active / Low Stock /    │
│  last 10 (4/7)       │  Out of Stock counts (3/7)       │
└──────────────────────┴──────────────────────────────────┘
```

**Date range controls KPI cards and the chart.** Cashboxes always show live balance. Payments table shows the 10 most recent POSTED payments regardless of date range.

---

## Backend Changes

### 1. Extend `getDashboardSummary` — add date params

**File:** `apps/api/src/modules/reports/reports.service.ts`

Add `filters: { from?: string; to?: string }` parameter. When provided, scope `totalSales`, `totalPurchases`, `totalExpenses` to that date range and compute `netProfit = totalSales - totalPurchases - totalExpenses`. Default (no filters) = current calendar month (start-of-month → today).

Cashboxes, `lowStockItemsCount`, `totalActiveItems`, `totalActiveParties` remain **always-live** (no date filter applied to these).

Return shape:
```ts
{
  totalSales: number
  totalPurchases: number
  totalExpenses: number
  netProfit: number
  cashboxes: Array<{ id, name, balance, currency: { code, symbol } }>
  lowStockItemsCount: number
  totalActiveItems: number
  totalActiveParties: number
}
```

### 2. New `getDashboardChartData` method

**File:** `apps/api/src/modules/reports/reports.service.ts`

Groups posted invoices by calendar date (using Prisma `groupBy` or raw aggregation), split by `invoiceType.direction`. Returns `{ date: string, sales: number, purchases: number }[]` sorted ascending by date. Capped at **90 days** server-side to prevent runaway queries.

### 3. Update `DashboardController`

**File:** `apps/api/src/modules/reports/dashboard.controller.ts`

```
GET /dashboard/summary?from=2026-06-01&to=2026-06-29   ← add @Query('from') @Query('to')
GET /dashboard/chart-data?from=2026-06-01&to=2026-06-29  ← new route
```

Both `from`/`to` are optional. The controller passes them directly to the service. Swagger `@ApiQuery` decorators added for both params on both routes.

---

## API Client Changes

### New `DashboardClient`

**File:** `packages/api-client/src/clients/dashboard.client.ts`

```ts
export type DashboardSummaryResponse = {
  totalSales: number
  totalPurchases: number
  totalExpenses: number
  netProfit: number
  cashboxes: Array<{ id: string; name: string; balance: string; currency: { code: string; symbol: string } }>
  lowStockItemsCount: number
  totalActiveItems: number
  totalActiveParties: number
}

export type DashboardChartPoint = { date: string; sales: number; purchases: number }

export class DashboardClient {
  constructor(private readonly apiClient: ApiClient) {}
  async summary(filters?: DateRangeFilter): Promise<DashboardSummaryResponse>
  async chartData(filters?: DateRangeFilter): Promise<DashboardChartPoint[]>
}
```

Uses raw `ApiClient` calls (not `CrudClient`) since these are non-CRUD endpoints. `DateRangeFilter` is imported from `reports.client.ts` (already defined there).

**Register in:**
- `packages/api-client/src/clients/index.ts` — export `DashboardClient`
- `packages/api-client/src/api.ts` — add `dashboard: new DashboardClient(client)` to `createApi()`

---

## Frontend Module Structure

```
apps/dashboard/modules/home/
├── components/
│   ├── dashboard-date-range-picker.tsx   # shadcn Popover + Calendar, controlled from/to
│   ├── dashboard-kpi-cards.tsx           # 4 stat cards with skeleton + trend indicator
│   ├── dashboard-cashbox-cards.tsx       # horizontal scroll row, one card per cashbox
│   ├── dashboard-quick-actions.tsx       # 4 Link buttons → create pages
│   ├── dashboard-chart.tsx               # Recharts AreaChart (sales=emerald, purchases=blue)
│   ├── dashboard-low-stock.tsx           # top-5 items where quantity ≤ minQuantity
│   ├── dashboard-recent-payments.tsx     # 10 most recent POSTED payments, type badge
│   └── dashboard-items-overview.tsx      # 4 mini-stat chips
├── hooks/
│   ├── use-dashboard-summary.ts          # useQuery → api.dashboard.summary(from, to)
│   ├── use-dashboard-chart.ts            # useQuery → api.dashboard.chartData(from, to)
│   └── use-dashboard-movements.ts        # useQuery → api.payments.list({ status:'POSTED', limit:10 })
├── dashboard-content.tsx                 # replaces existing — composes all components
└── use-dashboard-data.ts                 # (existing, can be removed or left unused)
```

**Existing unused files** (`appointments-summary-card.tsx`, `vehicle-stats-cards.tsx`, `work-orders-status-card.tsx`, etc.) are left untouched — not deleted, not imported.

### Component Details

**`dashboard-date-range-picker.tsx`**
- shadcn `Popover` + `Calendar` in range mode
- Controlled: receives `from: Date | undefined`, `to: Date | undefined`, `onChange: (from, to) => void`
- Default value on mount: start of current calendar month → today
- i18n label for the button placeholder

**`dashboard-kpi-cards.tsx`**
- Receives `data: DashboardSummaryResponse | undefined`, `isLoading: boolean`
- 4 cards: Total Sales (emerald/TrendingUp), Total Purchases (blue/ShoppingCart), Net Profit (violet/LineChart), Total Expenses (amber/CreditCard)
- Skeleton placeholder while loading (shimmer via `animate-pulse`)
- Values formatted with `Intl.NumberFormat` as plain numbers — no currency symbol. The backend aggregates totals across all cashbox currencies, so no single symbol is correct. The number is shown suffixed with the locale decimal format only.

**`dashboard-cashbox-cards.tsx`**
- `overflow-x-auto` + `flex gap-4 pb-2` container
- Each card: left colored border (accent per index), cashbox name (top), currency code badge, balance formatted as `symbol + amount`
- Skeleton shows 3 placeholder cards while loading

**`dashboard-quick-actions.tsx`**
- 4 `<Link>` components styled as `h-24 flex-col gap-2 border rounded-lg` buttons
- Routes:
  - Sales Invoice → `/sales/invoices?action=create`
  - Purchase Invoice → `/purchases/invoices?action=create`
  - Receipt → `/finance/payments?action=create&type=RECEIPT`
  - Expense → `/finance/expenses?action=create`
- Each has a Lucide icon + i18n label

**`dashboard-chart.tsx`**
- `AreaChart` from recharts with gradient fills
- Sales: `#10b981` (emerald-500), Purchases: `#3b82f6` (blue-500)
- `dir="ltr"` wrapper for RTL layout compatibility
- Date labels on X axis formatted as `MMM dd` using `date-fns`
- Loading: full-height skeleton div

**`dashboard-low-stock.tsx`**
- Reads `lowStockItemsCount` from summary. Shows the count + a link to `/inventory/stock-balances`
- For the actual list of low-stock items, calls a separate `useQuery` using the existing `api.reports.stockBalance()` from `ReportsClient`; filters client-side to items where `quantity <= 0` or below a threshold, shows top 5 with quantity badge (red if 0, amber if low)

**`dashboard-recent-payments.tsx`**
- Uses `use-dashboard-movements.ts` → `api.payments.list({ status: 'POSTED', limit: 10 })`
- Columns: Date, Number, Type (RECEIPT badge = green / PAYMENT badge = red), Party name, Cashbox, Amount
- No date range filter (always shows latest 10 POSTED)

**`dashboard-items-overview.tsx`**
- 4 stat chips from summary data: Total Items, Active Items, Low Stock count, Out of Stock count
- Links to respective list pages on click

### Date Range State

Held in `dashboard-content.tsx` as:
```ts
const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
  from: startOfMonth(new Date()),
  to: new Date(),
})
```

Passed as `from.toISOString()` / `to.toISOString()` strings to both `use-dashboard-summary` and `use-dashboard-chart`.

### Loading Strategy

Each section has its own `isLoading` state — no global spinner. The page renders immediately with skeletons; sections fill in as their queries resolve. No section blocks another.

---

## i18n Keys

Add to `apps/dashboard/messages/en.json`, `ar.json`, `tr.json` under `business.dashboard`:

```json
{
  "business": {
    "dashboard": {
      "title": "Dashboard",
      "description": "Key business metrics for the selected period.",
      "dateRange": "Date Range",
      "dateRangePlaceholder": "Select period",
      "kpi": {
        "totalSales": "Total Sales",
        "totalPurchases": "Total Purchases",
        "netProfit": "Net Profit",
        "totalExpenses": "Total Expenses"
      },
      "cashboxes": {
        "title": "Cashboxes",
        "balance": "Balance"
      },
      "quickActions": {
        "title": "Quick Actions",
        "salesInvoice": "Sales Invoice",
        "purchaseInvoice": "Purchase Invoice",
        "receipt": "Receipt",
        "expense": "Expense"
      },
      "chart": {
        "title": "Sales vs Purchases",
        "description": "Day-by-day comparison for the selected period.",
        "sales": "Sales",
        "purchases": "Purchases"
      },
      "lowStock": {
        "title": "Low Stock Alerts",
        "description": "Items at or below minimum quantity.",
        "viewAll": "View All"
      },
      "recentPayments": {
        "title": "Recent Payments",
        "date": "Date",
        "number": "Number",
        "type": "Type",
        "party": "Party",
        "cashbox": "Cashbox",
        "amount": "Amount"
      },
      "itemsOverview": {
        "title": "Items Overview",
        "total": "Total Items",
        "active": "Active",
        "lowStock": "Low Stock",
        "outOfStock": "Out of Stock"
      }
    }
  }
}
```

---

## Files to Create / Modify

| File | Action |
|---|---|
| `apps/api/src/modules/reports/reports.service.ts` | Modify — extend `getDashboardSummary`, add `getDashboardChartData` |
| `apps/api/src/modules/reports/dashboard.controller.ts` | Modify — add `from`/`to` query params, new `chart-data` route |
| `packages/api-client/src/clients/dashboard.client.ts` | Create |
| `packages/api-client/src/clients/index.ts` | Modify — export DashboardClient |
| `packages/api-client/src/api.ts` | Modify — register `api.dashboard` |
| `apps/dashboard/modules/home/components/dashboard-date-range-picker.tsx` | Create |
| `apps/dashboard/modules/home/components/dashboard-kpi-cards.tsx` | Create |
| `apps/dashboard/modules/home/components/dashboard-cashbox-cards.tsx` | Create |
| `apps/dashboard/modules/home/components/dashboard-quick-actions.tsx` | Create |
| `apps/dashboard/modules/home/components/dashboard-chart.tsx` | Create |
| `apps/dashboard/modules/home/components/dashboard-low-stock.tsx` | Create |
| `apps/dashboard/modules/home/components/dashboard-recent-payments.tsx` | Create |
| `apps/dashboard/modules/home/components/dashboard-items-overview.tsx` | Create |
| `apps/dashboard/modules/home/hooks/use-dashboard-summary.ts` | Create |
| `apps/dashboard/modules/home/hooks/use-dashboard-chart.ts` | Create |
| `apps/dashboard/modules/home/hooks/use-dashboard-movements.ts` | Create |
| `apps/dashboard/modules/home/dashboard-content.tsx` | Replace entirely |
| `apps/dashboard/messages/en.json` | Modify — add `business.dashboard.*` keys |
| `apps/dashboard/messages/ar.json` | Modify — add Arabic translations |
| `apps/dashboard/messages/tr.json` | Modify — add Turkish translations |

---

## Verification

1. **Backend**: Start API, hit `GET /dashboard/summary?from=2026-06-01&to=2026-06-29` — verify non-zero `totalSales`, `cashboxes` array with balances and currency.
2. **Backend**: Hit `GET /dashboard/chart-data?from=2026-06-01&to=2026-06-29` — verify array of `{ date, sales, purchases }` points.
3. **Frontend**: Load `/` — all 6 zones render with skeleton then real data.
4. **Date picker**: Change date range → KPI cards and chart update reactively.
5. **Cashboxes**: Each active cashbox appears as its own card with correct balance and currency.
6. **Quick actions**: Click each button — verify navigation to correct route.
7. **RTL**: Switch locale to Arabic — chart stays LTR, layout flips correctly, all labels in Arabic.
8. **Low stock**: Verify top-5 low-stock items appear with correct quantity badges.
9. **Recent payments**: Verify last 10 POSTED payments show with correct type badges.
