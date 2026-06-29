# Dashboard Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the all-mock-data home dashboard with a live ERP dashboard featuring a custom date range picker, 4 KPI cards, per-cashbox balance cards, quick actions, a sales-vs-purchases area chart, low-stock alerts, recent payments table, and items overview — all wired to real API data with full i18n.

**Architecture:** Minimal backend additions (extend `/dashboard/summary` with date params + new `/dashboard/chart-data` route) + a new `DashboardClient` in the api-client package + parallel `useQuery` hooks per section so no single slow query blocks the whole page.

**Tech Stack:** NestJS (backend), Prisma (data), `@devloggers/api-client` (HTTP), TanStack Query (data fetching), Recharts (`AreaChart`), shadcn UI (Calendar, Popover, Card, Button, Table, Badge, Skeleton), date-fns v4, next-intl.

**Spec:** `docs/superpowers/specs/2026-06-29-dashboard-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/api/src/modules/reports/reports.service.ts` | Modify | Add `getDashboardChartData`, extend `getDashboardSummary` with date params |
| `apps/api/src/modules/reports/dashboard.controller.ts` | Modify | Add `from`/`to` query params to summary route; add `GET /dashboard/chart-data` |
| `packages/api-client/src/clients/dashboard.client.ts` | Create | `DashboardClient` — `summary()` + `chartData()` methods |
| `packages/api-client/src/clients/index.ts` | Modify | Export `DashboardClient` |
| `packages/api-client/src/api.ts` | Modify | Register `api.dashboard` |
| `packages/i18n/src/en/business.json` | Modify | Add `dashboard.*` keys (English) |
| `packages/i18n/src/ar/business.json` | Modify | Add `dashboard.*` keys (Arabic) |
| `packages/i18n/src/tr/business.json` | Modify | Add `dashboard.*` keys (Turkish) |
| `apps/dashboard/modules/home/hooks/use-dashboard-summary.ts` | Create | `useQuery` → `api.dashboard.summary` |
| `apps/dashboard/modules/home/hooks/use-dashboard-chart.ts` | Create | `useQuery` → `api.dashboard.chartData` |
| `apps/dashboard/modules/home/hooks/use-dashboard-movements.ts` | Create | `useQuery` → `api.payments.list` (last 10 POSTED) |
| `apps/dashboard/modules/home/components/dashboard-date-range-picker.tsx` | Create | Controlled from/to date picker (shadcn Popover + Calendar) |
| `apps/dashboard/modules/home/components/dashboard-kpi-cards.tsx` | Create | 4 stat cards: sales, purchases, profit, expenses |
| `apps/dashboard/modules/home/components/dashboard-cashbox-cards.tsx` | Create | Horizontal scroll row, one card per cashbox |
| `apps/dashboard/modules/home/components/dashboard-quick-actions.tsx` | Create | 4 nav link buttons → create pages |
| `apps/dashboard/modules/home/components/dashboard-chart.tsx` | Create | Recharts AreaChart with gradient fill |
| `apps/dashboard/modules/home/components/dashboard-low-stock.tsx` | Create | Top-5 items at/below zero quantity |
| `apps/dashboard/modules/home/components/dashboard-recent-payments.tsx` | Create | Table of last 10 POSTED payments |
| `apps/dashboard/modules/home/components/dashboard-items-overview.tsx` | Create | 4 mini-stat chips from summary |
| `apps/dashboard/modules/home/dashboard-content.tsx` | Replace | Composes all components, holds dateRange state |

---

## Task 1: Extend backend service — date-filtered summary + chart data

**Files:**
- Modify: `apps/api/src/modules/reports/reports.service.ts`

- [ ] **Replace `getDashboardSummary` with date-filtered version and add `getDashboardChartData`**

Open `apps/api/src/modules/reports/reports.service.ts`. Replace the entire `getDashboardSummary` method and add `getDashboardChartData` after it:

```typescript
async getDashboardSummary(tenantId: string, filters?: { from?: string; to?: string }) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const from = filters?.from ? new Date(filters.from) : startOfMonth;
    const to = filters?.to ? new Date(filters.to) : today;
    const dateFilter = { gte: from, lte: to };

    const [
        salesAgg, purchasesAgg, expensesAgg,
        cashboxes, lowStockCount,
        partiesCount, itemsCount,
    ] = await Promise.all([
        this.prisma.invoice.aggregate({
            where: { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' }, date: dateFilter },
            _sum: { total: true },
        }),
        this.prisma.invoice.aggregate({
            where: { tenantId, status: 'POSTED', invoiceType: { direction: 'PURCHASE' }, date: dateFilter },
            _sum: { total: true },
        }),
        this.prisma.expense.aggregate({
            where: { tenantId, status: 'POSTED', date: dateFilter },
            _sum: { totalAmount: true },
        }),
        this.prisma.cashbox.findMany({
            where: { tenantId, isActive: true },
            include: { currency: { select: { code: true, symbol: true } } },
        }),
        this.prisma.stockBalance.count({ where: { tenantId, quantity: { lte: 0 } } }),
        this.prisma.party.count({ where: { tenantId, isActive: true } }),
        this.prisma.item.count({ where: { tenantId, isActive: true } }),
    ]);

    const totalSales = Number(salesAgg._sum.total || 0);
    const totalPurchases = Number(purchasesAgg._sum.total || 0);
    const totalExpenses = Number(expensesAgg._sum.totalAmount || 0);

    return {
        totalSales,
        totalPurchases,
        totalExpenses,
        netProfit: totalSales - totalPurchases - totalExpenses,
        cashboxes,
        lowStockItemsCount: lowStockCount,
        totalActiveParties: partiesCount,
        totalActiveItems: itemsCount,
    };
}

async getDashboardChartData(tenantId: string, filters?: { from?: string; to?: string }) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const from = filters?.from ? new Date(filters.from) : startOfMonth;
    const to = filters?.to ? new Date(filters.to) : today;

    // Cap at 90 days
    const cap = new Date(from);
    cap.setDate(cap.getDate() + 90);
    const cappedTo = to > cap ? cap : to;

    const [salesInvoices, purchaseInvoices] = await Promise.all([
        this.prisma.invoice.findMany({
            where: { tenantId, status: 'POSTED', invoiceType: { direction: 'SALE' }, date: { gte: from, lte: cappedTo } },
            select: { date: true, total: true },
            orderBy: { date: 'asc' },
        }),
        this.prisma.invoice.findMany({
            where: { tenantId, status: 'POSTED', invoiceType: { direction: 'PURCHASE' }, date: { gte: from, lte: cappedTo } },
            select: { date: true, total: true },
            orderBy: { date: 'asc' },
        }),
    ]);

    const map = new Map<string, { sales: number; purchases: number }>();

    for (const inv of salesInvoices) {
        const key = inv.date.toISOString().split('T')[0];
        const entry = map.get(key) ?? { sales: 0, purchases: 0 };
        entry.sales += Number(inv.total);
        map.set(key, entry);
    }

    for (const inv of purchaseInvoices) {
        const key = inv.date.toISOString().split('T')[0];
        const entry = map.get(key) ?? { sales: 0, purchases: 0 };
        entry.purchases += Number(inv.total);
        map.set(key, entry);
    }

    return Array.from(map.entries())
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => a.date.localeCompare(b.date));
}
```

- [ ] **Commit**

```bash
git add apps/api/src/modules/reports/reports.service.ts
git commit -m "feat(dashboard): extend getDashboardSummary with date filter; add getDashboardChartData"
```

---

## Task 2: Update DashboardController — date params + chart-data route

**Files:**
- Modify: `apps/api/src/modules/reports/dashboard.controller.ts`

- [ ] **Replace controller content with the following**

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../identity/auth/guards';
import { CurrentUser, RequestUser } from '../identity/auth/decorators';
import { ApiResponseBuilder } from '../../common/api/api-response-builder';
import { ApiStandardErrors } from '../../common/decorators/api-swagger.decorators';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DashboardController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('summary')
    @ApiOperation({ summary: 'Get dashboard summary', description: 'Key business metrics for the selected date range. Defaults to current calendar month.' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponse({ description: 'Dashboard summary data' })
    @ApiStandardErrors()
    async summary(
        @CurrentUser() user: RequestUser,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return ApiResponseBuilder.success(
            await this.reportsService.getDashboardSummary(user.tenantId, { from, to }),
            'Dashboard summary',
        );
    }

    @Get('chart-data')
    @ApiOperation({ summary: 'Get dashboard chart data', description: 'Day-by-day sales and purchases totals for the selected date range (max 90 days).' })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponse({
        description: 'Chart data points',
        schema: {
            example: {
                message: 'Chart data',
                data: [{ date: '2026-06-01', sales: 4200, purchases: 1800 }],
            },
        },
    })
    @ApiStandardErrors()
    async chartData(
        @CurrentUser() user: RequestUser,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return ApiResponseBuilder.success(
            await this.reportsService.getDashboardChartData(user.tenantId, { from, to }),
            'Chart data',
        );
    }
}
```

- [ ] **Commit**

```bash
git add apps/api/src/modules/reports/dashboard.controller.ts
git commit -m "feat(dashboard): add date params to summary route; add chart-data route"
```

---

## Task 3: Create DashboardClient

**Files:**
- Create: `packages/api-client/src/clients/dashboard.client.ts`

- [ ] **Create the file**

```typescript
import { ApiClient } from "../infra/client"
import type { DateRangeFilter } from "./reports.client"

export type DashboardCashbox = {
    id: string
    code: string
    name: Record<string, string>   // LocalizedString { ar: string; en?: string; tr?: string }
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
```

- [ ] **Export from clients barrel (`packages/api-client/src/clients/index.ts`)**

Add this line at the end of the file:
```typescript
export * from "./dashboard.client"
```

- [ ] **Register in `packages/api-client/src/api.ts`**

Import at top:
```typescript
import { DashboardClient } from "./clients/dashboard.client"
```

Add to the returned object inside `createApi()`:
```typescript
dashboard: new DashboardClient(client),
```

- [ ] **Commit**

```bash
git add packages/api-client/src/clients/dashboard.client.ts packages/api-client/src/clients/index.ts packages/api-client/src/api.ts
git commit -m "feat(api-client): add DashboardClient with summary and chartData methods"
```

---

## Task 4: Add i18n keys to all three locales

**Files:**
- Modify: `packages/i18n/src/en/business.json`
- Modify: `packages/i18n/src/ar/business.json`
- Modify: `packages/i18n/src/tr/business.json`

- [ ] **Add to `packages/i18n/src/en/business.json`** — insert `"dashboard"` key before the closing `}` of the root object:

```json
  "dashboard": {
    "title": "Dashboard",
    "description": "Key business metrics for the selected period.",
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
      "viewAll": "View All",
      "quantity": "Qty"
    },
    "recentPayments": {
      "title": "Recent Payments",
      "date": "Date",
      "number": "Number",
      "type": "Type",
      "party": "Party",
      "cashbox": "Cashbox",
      "amount": "Amount",
      "receipt": "Receipt",
      "payment": "Payment",
      "adjustment": "Adjustment"
    },
    "itemsOverview": {
      "title": "Items Overview",
      "total": "Total Items",
      "active": "Active",
      "lowStock": "Low Stock",
      "outOfStock": "Out of Stock"
    }
  }
```

- [ ] **Add to `packages/i18n/src/ar/business.json`** — same structure, Arabic values:

```json
  "dashboard": {
    "title": "لوحة التحكم",
    "description": "المؤشرات التجارية الرئيسية للفترة المحددة.",
    "dateRangePlaceholder": "اختر الفترة",
    "kpi": {
      "totalSales": "إجمالي المبيعات",
      "totalPurchases": "إجمالي المشتريات",
      "netProfit": "صافي الربح",
      "totalExpenses": "إجمالي المصروفات"
    },
    "cashboxes": {
      "title": "الخزائن",
      "balance": "الرصيد"
    },
    "quickActions": {
      "title": "الإجراءات السريعة",
      "salesInvoice": "فاتورة مبيعات",
      "purchaseInvoice": "فاتورة مشتريات",
      "receipt": "سند قبض",
      "expense": "مصروف"
    },
    "chart": {
      "title": "المبيعات مقابل المشتريات",
      "description": "مقارنة يومية للفترة المحددة.",
      "sales": "المبيعات",
      "purchases": "المشتريات"
    },
    "lowStock": {
      "title": "تنبيهات المخزون",
      "description": "أصناف وصلت إلى الحد الأدنى أو أقل.",
      "viewAll": "عرض الكل",
      "quantity": "الكمية"
    },
    "recentPayments": {
      "title": "آخر الحركات",
      "date": "التاريخ",
      "number": "الرقم",
      "type": "النوع",
      "party": "الطرف",
      "cashbox": "الخزينة",
      "amount": "المبلغ",
      "receipt": "قبض",
      "payment": "صرف",
      "adjustment": "تسوية"
    },
    "itemsOverview": {
      "title": "نظرة عامة على الأصناف",
      "total": "إجمالي الأصناف",
      "active": "نشط",
      "lowStock": "مخزون منخفض",
      "outOfStock": "نفذ المخزون"
    }
  }
```

- [ ] **Add to `packages/i18n/src/tr/business.json`** — Turkish values:

```json
  "dashboard": {
    "title": "Kontrol Paneli",
    "description": "Seçilen dönem için temel iş metrikleri.",
    "dateRangePlaceholder": "Dönem seçin",
    "kpi": {
      "totalSales": "Toplam Satışlar",
      "totalPurchases": "Toplam Alımlar",
      "netProfit": "Net Kâr",
      "totalExpenses": "Toplam Giderler"
    },
    "cashboxes": {
      "title": "Kasalar",
      "balance": "Bakiye"
    },
    "quickActions": {
      "title": "Hızlı İşlemler",
      "salesInvoice": "Satış Faturası",
      "purchaseInvoice": "Alım Faturası",
      "receipt": "Tahsilat",
      "expense": "Gider"
    },
    "chart": {
      "title": "Satışlar ve Alımlar",
      "description": "Seçilen dönem için günlük karşılaştırma.",
      "sales": "Satışlar",
      "purchases": "Alımlar"
    },
    "lowStock": {
      "title": "Düşük Stok Uyarıları",
      "description": "Minimum miktarda veya altında olan ürünler.",
      "viewAll": "Tümünü Gör",
      "quantity": "Miktar"
    },
    "recentPayments": {
      "title": "Son Hareketler",
      "date": "Tarih",
      "number": "Numara",
      "type": "Tür",
      "party": "Taraf",
      "cashbox": "Kasa",
      "amount": "Tutar",
      "receipt": "Tahsilat",
      "payment": "Ödeme",
      "adjustment": "Düzeltme"
    },
    "itemsOverview": {
      "title": "Ürün Genel Bakışı",
      "total": "Toplam Ürünler",
      "active": "Aktif",
      "lowStock": "Düşük Stok",
      "outOfStock": "Stok Tükendi"
    }
  }
```

- [ ] **Commit**

```bash
git add packages/i18n/src/en/business.json packages/i18n/src/ar/business.json packages/i18n/src/tr/business.json
git commit -m "feat(i18n): add dashboard namespace keys in EN/AR/TR"
```

---

## Task 5: Create the three data hooks

**Files:**
- Create: `apps/dashboard/modules/home/hooks/use-dashboard-summary.ts`
- Create: `apps/dashboard/modules/home/hooks/use-dashboard-chart.ts`
- Create: `apps/dashboard/modules/home/hooks/use-dashboard-movements.ts`

- [ ] **Create `use-dashboard-summary.ts`**

```typescript
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardSummary(from?: string, to?: string) {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "summary", from, to],
        queryFn: () =>
            api.dashboard.summary(from || to ? { from, to } : undefined),
    })
}
```

- [ ] **Create `use-dashboard-chart.ts`**

```typescript
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardChart(from?: string, to?: string) {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "chart", from, to],
        queryFn: () =>
            api.dashboard.chartData(from || to ? { from, to } : undefined),
    })
}
```

- [ ] **Create `use-dashboard-movements.ts`**

```typescript
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardMovements() {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "movements"],
        queryFn: () =>
            api.payments.list({ status: "POSTED" as const, limit: 10, page: 1 }),
    })
}
```

- [ ] **Create `apps/dashboard/modules/home/hooks/index.ts`**

```typescript
export { useDashboardSummary } from "./use-dashboard-summary"
export { useDashboardChart } from "./use-dashboard-chart"
export { useDashboardMovements } from "./use-dashboard-movements"
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/hooks/
git commit -m "feat(dashboard): add data hooks for summary, chart, and movements"
```

---

## Task 6: DashboardDateRangePicker component

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-date-range-picker.tsx`

- [ ] **Create the file**

```tsx
"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/shared/components/ui/button"
import { Calendar } from "@/shared/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/shared/components/ui/popover"
import { useTranslations } from "next-intl"

interface DashboardDateRangePickerProps {
    from: Date
    to: Date
    onChange: (range: { from: Date; to: Date }) => void
}

export function DashboardDateRangePicker({
    from,
    to,
    onChange,
}: DashboardDateRangePickerProps) {
    const t = useTranslations("dashboard")
    const [open, setOpen] = React.useState(false)

    const handleSelect = (range: DateRange | undefined) => {
        if (range?.from && range?.to) {
            onChange({ from: range.from, to: range.to })
            setOpen(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 h-9">
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    <span>
                        {format(from, "MMM d")} – {format(to, "MMM d, yyyy")}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    mode="range"
                    selected={{ from, to }}
                    onSelect={handleSelect}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                />
            </PopoverContent>
        </Popover>
    )
}
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-date-range-picker.tsx
git commit -m "feat(dashboard): add DashboardDateRangePicker component"
```

---

## Task 7: DashboardKpiCards component

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-kpi-cards.tsx`

- [ ] **Create the file**

```tsx
import {
    TrendingUp,
    ShoppingCart,
    LineChart,
    CreditCard,
} from "lucide-react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations } from "next-intl"
import type { DashboardSummaryResponse } from "@devloggers/api-client"

interface DashboardKpiCardsProps {
    data: DashboardSummaryResponse | undefined
    isLoading: boolean
}

function formatNumber(value: number) {
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value)
}

export function DashboardKpiCards({ data, isLoading }: DashboardKpiCardsProps) {
    const t = useTranslations("dashboard.kpi")

    const cards = [
        {
            label: t("totalSales"),
            value: data?.totalSales ?? 0,
            icon: TrendingUp,
            iconClass: "text-emerald-500",
        },
        {
            label: t("totalPurchases"),
            value: data?.totalPurchases ?? 0,
            icon: ShoppingCart,
            iconClass: "text-blue-500",
        },
        {
            label: t("netProfit"),
            value: data?.netProfit ?? 0,
            icon: LineChart,
            iconClass: "text-violet-500",
        },
        {
            label: t("totalExpenses"),
            value: data?.totalExpenses ?? 0,
            icon: CreditCard,
            iconClass: "text-amber-500",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card key={card.label}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.label}
                            </CardTitle>
                            <Icon className={`h-4 w-4 ${card.iconClass}`} />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-32" />
                            ) : (
                                <div className="text-2xl font-bold">
                                    {formatNumber(card.value)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-kpi-cards.tsx
git commit -m "feat(dashboard): add DashboardKpiCards component"
```

---

## Task 8: DashboardCashboxCards component

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-cashbox-cards.tsx`

- [ ] **Create the file**

```tsx
import { WalletIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import type { DashboardCashbox } from "@devloggers/api-client"

const BORDER_COLORS = [
    "border-s-emerald-500",
    "border-s-blue-500",
    "border-s-violet-500",
    "border-s-amber-500",
    "border-s-rose-500",
    "border-s-cyan-500",
]

function getLocalizedName(
    name: Record<string, string> | unknown,
    locale: string,
): string {
    if (typeof name === "string") return name
    if (name && typeof name === "object") {
        const n = name as Record<string, string>
        return n[locale] ?? n["ar"] ?? n["en"] ?? ""
    }
    return ""
}

interface DashboardCashboxCardsProps {
    cashboxes: DashboardCashbox[]
    isLoading: boolean
}

export function DashboardCashboxCards({
    cashboxes,
    isLoading,
}: DashboardCashboxCardsProps) {
    const t = useTranslations("dashboard.cashboxes")
    const locale = useLocale()

    return (
        <div>
            <h2 className="text-lg font-semibold mb-3">{t("title")}</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
                {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-28 w-48 shrink-0 rounded-lg" />
                      ))
                    : cashboxes.map((cashbox, i) => (
                          <Card
                              key={cashbox.id}
                              className={`shrink-0 w-52 border-s-4 ${BORDER_COLORS[i % BORDER_COLORS.length]}`}
                          >
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
                                  <CardTitle className="text-sm font-medium truncate">
                                      {getLocalizedName(cashbox.name, locale)}
                                  </CardTitle>
                                  <WalletIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              </CardHeader>
                              <CardContent className="pb-4">
                                  <div className="text-xl font-bold">
                                      {cashbox.currency.symbol}{" "}
                                      {new Intl.NumberFormat(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                      }).format(Number(cashbox.balance))}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                      {cashbox.currency.code} · {t("balance")}
                                  </p>
                              </CardContent>
                          </Card>
                      ))}
            </div>
        </div>
    )
}
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-cashbox-cards.tsx
git commit -m "feat(dashboard): add DashboardCashboxCards component"
```

---

## Task 9: DashboardQuickActions component

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-quick-actions.tsx`

- [ ] **Create the file**

```tsx
import Link from "next/link"
import {
    ReceiptIcon,
    ShoppingCartIcon,
    HandCoinsIcon,
    CreditCardIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

const ACTIONS = [
    {
        key: "salesInvoice" as const,
        href: "/sales/invoices?action=create",
        icon: ReceiptIcon,
        hoverClass: "hover:border-emerald-500 hover:text-emerald-500",
    },
    {
        key: "purchaseInvoice" as const,
        href: "/purchases/invoices?action=create",
        icon: ShoppingCartIcon,
        hoverClass: "hover:border-blue-500 hover:text-blue-500",
    },
    {
        key: "receipt" as const,
        href: "/finance/payments?action=create&type=RECEIPT",
        icon: HandCoinsIcon,
        hoverClass: "hover:border-violet-500 hover:text-violet-500",
    },
    {
        key: "expense" as const,
        href: "/finance/expenses?action=create",
        icon: CreditCardIcon,
        hoverClass: "hover:border-amber-500 hover:text-amber-500",
    },
]

export function DashboardQuickActions() {
    const t = useTranslations("dashboard.quickActions")

    return (
        <div>
            <h2 className="text-lg font-semibold mb-3">{t("title")}</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {ACTIONS.map(({ key, href, icon: Icon, hoverClass }) => (
                    <Link
                        key={key}
                        href={href}
                        className={`flex h-24 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-sm font-medium transition-colors ${hoverClass}`}
                    >
                        <Icon className="h-6 w-6" />
                        <span>{t(key)}</span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-quick-actions.tsx
git commit -m "feat(dashboard): add DashboardQuickActions component"
```

---

## Task 10: DashboardChart component

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-chart.tsx`

- [ ] **Create the file**

```tsx
"use client"

import * as React from "react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations } from "next-intl"
import type { DashboardChartPoint } from "@devloggers/api-client"

interface DashboardChartProps {
    data: DashboardChartPoint[]
    isLoading: boolean
}

function formatDate(dateStr: string) {
    try {
        return format(new Date(dateStr + "T00:00:00"), "MMM d")
    } catch {
        return dateStr
    }
}

export function DashboardChart({ data, isLoading }: DashboardChartProps) {
    const t = useTranslations("dashboard.chart")
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = data.map((point) => ({
        ...point,
        date: formatDate(point.date),
    }))

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading || !mounted ? (
                    <Skeleton className="h-[320px] w-full" />
                ) : (
                    <div className="h-[320px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    width={70}
                                    tickFormatter={(v) =>
                                        new Intl.NumberFormat(undefined, {
                                            notation: "compact",
                                        }).format(v)
                                    }
                                />
                                <Tooltip
                                    cursor={{ fill: "#88888811" }}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "1px solid #88888833",
                                        fontSize: "12px",
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }} />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    name={t("sales")}
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="url(#colorSales)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="purchases"
                                    name={t("purchases")}
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorPurchases)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-chart.tsx
git commit -m "feat(dashboard): add DashboardChart AreaChart component"
```

---

## Task 11: DashboardLowStock component

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-low-stock.tsx`

- [ ] **Create the file**

```tsx
"use client"

import Link from "next/link"
import { AlertTriangleIcon } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function DashboardLowStock() {
    const t = useTranslations("dashboard.lowStock")
    const api = useApi()

    const { data: stockData, isLoading } = useQuery({
        queryKey: ["dashboard", "low-stock"],
        queryFn: () => api.reports.stockBalance(),
    })

    const lowItems = (stockData ?? [])
        .filter((item) => item.quantity <= 0)
        .slice(0, 5)

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                    <AlertTriangleIcon className="h-4 w-4" />
                    {t("title")}
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                              <Skeleton key={i} className="h-10 w-full" />
                          ))
                        : lowItems.map((item) => (
                              <div
                                  key={`${item.itemId}-${item.warehouseId}`}
                                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                              >
                                  <div className="space-y-0.5 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                          {item.itemName ?? item.itemCode}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                          {item.warehouseName}
                                      </p>
                                  </div>
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm shrink-0 ms-2">
                                      {item.quantity}
                                  </div>
                              </div>
                          ))}
                </div>
                <Button variant="outline" className="w-full mt-4" asChild>
                    <Link href="/inventory/stock-balances">{t("viewAll")}</Link>
                </Button>
            </CardContent>
        </Card>
    )
}
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-low-stock.tsx
git commit -m "feat(dashboard): add DashboardLowStock component"
```

---

## Task 12: DashboardRecentPayments component

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-recent-payments.tsx`

- [ ] **Create the file**

```tsx
import { format } from "date-fns"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations } from "next-intl"
import { useDashboardMovements } from "../hooks"

const TYPE_VARIANT: Record<string, "default" | "destructive" | "secondary"> = {
    RECEIPT: "default",
    PAYMENT: "destructive",
    ADJUSTMENT: "secondary",
}

export function DashboardRecentPayments() {
    const t = useTranslations("dashboard.recentPayments")
    const { data, isLoading } = useDashboardMovements()

    const payments = (data as any)?.data ?? []

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("number")}</TableHead>
                                <TableHead>{t("type")}</TableHead>
                                <TableHead>{t("cashbox")}</TableHead>
                                <TableHead className="text-end">{t("amount")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((payment: any) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(payment.date), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {payment.number}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={TYPE_VARIANT[payment.type] ?? "secondary"}>
                                            {t(payment.type?.toLowerCase() as "receipt" | "payment" | "adjustment")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {payment.cashbox?.name ?? "—"}
                                    </TableCell>
                                    <TableCell className="text-end font-bold">
                                        {new Intl.NumberFormat(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }).format(Number(payment.amount))}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-recent-payments.tsx
git commit -m "feat(dashboard): add DashboardRecentPayments component"
```

---

## Task 13: DashboardItemsOverview component

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-items-overview.tsx`

- [ ] **Create the file**

```tsx
import Link from "next/link"
import { PackageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations } from "next-intl"
import type { DashboardSummaryResponse } from "@devloggers/api-client"

interface DashboardItemsOverviewProps {
    data: DashboardSummaryResponse | undefined
    isLoading: boolean
}

export function DashboardItemsOverview({ data, isLoading }: DashboardItemsOverviewProps) {
    const t = useTranslations("dashboard.itemsOverview")

    const stats = [
        {
            label: t("active"),
            value: data?.totalActiveItems ?? 0,
            href: "/catalog/items",
            colorClass: "text-emerald-600",
        },
        {
            label: t("total"),
            value: data?.totalActiveParties ?? 0,
            href: "/parties/customers",
            colorClass: "text-blue-600",
        },
        {
            label: t("outOfStock"),
            value: data?.lowStockItemsCount ?? 0,
            href: "/inventory/stock-balances",
            colorClass: "text-red-600",
        },
    ]

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PackageIcon className="h-4 w-4 text-indigo-500" />
                    {t("title")}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="space-y-4">
                    {stats.map((stat) => (
                        <Link
                            key={stat.label}
                            href={stat.href}
                            className="flex items-center justify-between group"
                        >
                            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                {stat.label}
                            </span>
                            {isLoading ? (
                                <Skeleton className="h-6 w-16" />
                            ) : (
                                <span className={`text-lg font-bold ${stat.colorClass}`}>
                                    {stat.value.toLocaleString()}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-items-overview.tsx
git commit -m "feat(dashboard): add DashboardItemsOverview component"
```

---

## Task 14: Wire dashboard-content.tsx

**Files:**
- Replace: `apps/dashboard/modules/home/dashboard-content.tsx`

- [ ] **Replace the entire file content**

```tsx
"use client"

import * as React from "react"
import { startOfMonth } from "date-fns"
import DashboardPage from "@/infrastructure/components/layout/dashboard/dashboard-page"
import { useTranslations } from "next-intl"
import { DashboardDateRangePicker } from "./components/dashboard-date-range-picker"
import { DashboardKpiCards } from "./components/dashboard-kpi-cards"
import { DashboardCashboxCards } from "./components/dashboard-cashbox-cards"
import { DashboardQuickActions } from "./components/dashboard-quick-actions"
import { DashboardChart } from "./components/dashboard-chart"
import { DashboardLowStock } from "./components/dashboard-low-stock"
import { DashboardRecentPayments } from "./components/dashboard-recent-payments"
import { DashboardItemsOverview } from "./components/dashboard-items-overview"
import { useDashboardSummary } from "./hooks/use-dashboard-summary"
import { useDashboardChart } from "./hooks/use-dashboard-chart"

export function DashboardContent() {
    const t = useTranslations("dashboard")

    const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: new Date(),
    })

    const fromIso = dateRange.from.toISOString()
    const toIso = dateRange.to.toISOString()

    const summary = useDashboardSummary(fromIso, toIso)
    const chart = useDashboardChart(fromIso, toIso)

    return (
        <DashboardPage
            title={t("title")}
            description={t("description")}
            toolbar={
                <DashboardDateRangePicker
                    from={dateRange.from}
                    to={dateRange.to}
                    onChange={setDateRange}
                />
            }
        >
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* KPI Cards */}
                <DashboardKpiCards
                    data={summary.data}
                    isLoading={summary.isLoading}
                />

                {/* Cashbox Balance Cards */}
                <DashboardCashboxCards
                    cashboxes={summary.data?.cashboxes ?? []}
                    isLoading={summary.isLoading}
                />

                {/* Quick Actions */}
                <DashboardQuickActions />

                {/* Chart + Low Stock */}
                <div className="grid gap-4 md:grid-cols-7">
                    <div className="md:col-span-5">
                        <DashboardChart
                            data={chart.data ?? []}
                            isLoading={chart.isLoading}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <DashboardLowStock />
                    </div>
                </div>

                {/* Recent Payments + Items Overview */}
                <div className="grid gap-4 md:grid-cols-7">
                    <div className="md:col-span-4">
                        <DashboardRecentPayments />
                    </div>
                    <div className="md:col-span-3">
                        <DashboardItemsOverview
                            data={summary.data}
                            isLoading={summary.isLoading}
                        />
                    </div>
                </div>
            </div>
        </DashboardPage>
    )
}
```

- [ ] **Commit**

```bash
git add apps/dashboard/modules/home/dashboard-content.tsx
git commit -m "feat(dashboard): wire all components into DashboardContent with real API data"
```

---

## Task 15: End-to-end verification

- [ ] **Start the API and dashboard dev servers**

```bash
# Terminal 1
pnpm --filter @devloggers/api dev

# Terminal 2
pnpm --filter @devloggers/dashboard dev
```

- [ ] **Verify backend endpoints**

```bash
# Replace TOKEN with a real JWT from the login response
curl -H "Authorization: Bearer TOKEN" "http://localhost:4040/dashboard/summary?from=2026-06-01&to=2026-06-29"
# Expected: { status:'success', data: { totalSales, totalPurchases, totalExpenses, netProfit, cashboxes: [...], ... } }

curl -H "Authorization: Bearer TOKEN" "http://localhost:4040/dashboard/chart-data?from=2026-06-01&to=2026-06-29"
# Expected: { status:'success', data: [{ date:'2026-06-01', sales:0, purchases:0 }, ...] }
```

- [ ] **Verify dashboard UI at `http://localhost:3000`**

Check each zone renders without errors:
- KPI cards show real numbers (not mock Arabic text)
- Cashbox cards display with currency and balance
- Quick action buttons are present and clickable
- Chart renders (may be empty if no posted invoices in range — try wider date range)
- Low stock panel shows items or empty state
- Recent payments table shows real data or empty state
- Items overview shows correct counts

- [ ] **Test date range picker**

Change the date range — confirm KPI cards and chart update (skeleton flashes then new values appear).

- [ ] **Test RTL**

Switch to Arabic locale. Confirm:
- All labels are in Arabic
- Layout is mirrored (start/end reversed)
- Chart container keeps `dir="ltr"` (chart axes do not flip)
- Cashbox cards scroll correctly in RTL

- [ ] **Final commit**

```bash
git add .
git commit -m "feat(dashboard): complete live ERP dashboard with real API data and i18n"
```
