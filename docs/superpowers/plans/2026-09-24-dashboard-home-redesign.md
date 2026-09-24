# ERP Home Dashboard Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the ERP home dashboard (`apps/dashboard/modules/home/`) into a genuinely richer, on-brand dashboard — trend deltas, cash/revenue/expense composition charts, a top-sellers ranking — while keeping Quick Actions exactly as visible as today, and remove 10 orphaned files left over from an unrelated template.

**Architecture:** Two new read-only NestJS aggregate endpoints (`/dashboard/expense-breakdown`, `/dashboard/top-items`) follow the existing bespoke, DTO-free convention already used by `/dashboard/summary` and `/dashboard/chart-data`. All new/changed charts adopt the app's existing (but currently unused) shadcn `ChartContainer`/`ChartConfig` wrapper around Recharts, driven entirely by the app's existing `--chart-1..5` design tokens — no new colors, no hardcoded hex.

**Tech Stack:** NestJS + Prisma (`groupBy` aggregates), Next.js App Router + React Query, Recharts via `shared/components/ui/chart.tsx`, Tailwind v4 tokens, next-intl (en/ar/tr), Vitest (frontend pure-function tests), Jest (backend service tests).

## Global Constraints

- Tenant isolation on every new query (`tenantId` scoping, matching `getDashboardSummary`).
- No `as any`, `as unknown as X`, `@ts-ignore`, or untyped API response handling anywhere touched.
- All chart/accent colors reference `--chart-1..5` / `--success` / `--destructive` tokens — never a new hardcoded hex or an ad hoc Tailwind color name (`emerald-500`, `blue-500`, etc.).
- i18n: every new/changed user-facing string added to `packages/i18n/src/{en,ar,tr}/business.json` under `dashboard.*`.
- RTL-safe: logical CSS (`border-s-*`, `text-end`, etc.), matching the file's existing conventions.
- Quick Actions must remain reachable near the top of the page — this plan moves it from 3rd to 2nd block (right after KPIs), which is a prominence *increase*, not a regression.
- Verify with `pnpm turbo run build --filter=@devloggers/api` / `--filter=@devloggers/dashboard` after each task that touches that app; final task runs both plus lint.

---

### Task 1: Backend — expense-breakdown and top-items aggregate service methods

**Files:**
- Create: `apps/api/src/modules/reports/reports.service.spec.ts`
- Modify: `apps/api/src/modules/reports/reports.service.ts`

**Interfaces:**
- Produces: `ReportsService.getDashboardExpenseBreakdown(tenantId: string, filters?: { from?: string; to?: string }): Promise<Array<{ accountId: string; accountName: unknown; total: number }>>`
- Produces: `ReportsService.getDashboardTopItems(tenantId: string, filters?: { from?: string; to?: string; limit?: number }): Promise<Array<{ itemId: string; itemName: string; itemCode: string; quantity: number; revenue: number }>>`

- [ ] **Step 1: Write the failing test file**

Create `apps/api/src/modules/reports/reports.service.spec.ts`:

```ts
import { ReportsService } from './reports.service';

interface PrismaStub {
    expenseItemGroups?: Array<{ accountId: string; _sum: { amount: number | null } }>;
    accounts?: Array<{ id: string; name: unknown }>;
    invoiceLineGroups?: Array<{ itemId: string; _sum: { total: number | null; quantity: number | null } }>;
    items?: Array<{ id: string; name: string; code: string }>;
}

function makeService(stub: PrismaStub = {}): ReportsService {
    const prisma = {
        expenseItem: {
            groupBy: async () => stub.expenseItemGroups ?? [],
        },
        chartOfAccount: {
            findMany: async () => stub.accounts ?? [],
        },
        invoiceLine: {
            groupBy: async () => stub.invoiceLineGroups ?? [],
        },
        item: {
            findMany: async () => stub.items ?? [],
        },
    };
    return new ReportsService(prisma as never);
}

describe('ReportsService.getDashboardExpenseBreakdown', () => {
    it('resolves account names and keeps Prisma\'s descending order', async () => {
        const result = await makeService({
            expenseItemGroups: [
                { accountId: 'acc-1', _sum: { amount: 700 } },
                { accountId: 'acc-2', _sum: { amount: 300 } },
            ],
            accounts: [
                { id: 'acc-1', name: { en: 'Rent', ar: 'إيجار' } },
                { id: 'acc-2', name: { en: 'Utilities', ar: 'مرافق' } },
            ],
        }).getDashboardExpenseBreakdown('t1', {});

        expect(result).toEqual([
            { accountId: 'acc-1', accountName: { en: 'Rent', ar: 'إيجار' }, total: 700 },
            { accountId: 'acc-2', accountName: { en: 'Utilities', ar: 'مرافق' }, total: 300 },
        ]);
    });

    it('folds accounts beyond the top 5 into a single "other" bucket', async () => {
        const groups = Array.from({ length: 7 }, (_, i) => ({
            accountId: `acc-${i}`,
            _sum: { amount: (7 - i) * 100 },
        }));
        const accounts = groups.map((g) => ({
            id: g.accountId,
            name: { en: `Account ${g.accountId}`, ar: g.accountId },
        }));

        const result = await makeService({ expenseItemGroups: groups, accounts }).getDashboardExpenseBreakdown(
            't1',
            {},
        );

        expect(result).toHaveLength(6);
        expect(result[5]).toEqual({
            accountId: 'other',
            accountName: { en: 'Other', ar: 'أخرى' },
            total: 300, // acc-5 (200) + acc-6 (100)
        });
    });

    it('returns an empty array when there is no posted expense activity', async () => {
        const result = await makeService({}).getDashboardExpenseBreakdown('t1', {});
        expect(result).toEqual([]);
    });
});

describe('ReportsService.getDashboardTopItems', () => {
    it('resolves item names/codes for the grouped rows', async () => {
        const result = await makeService({
            invoiceLineGroups: [
                { itemId: 'item-1', _sum: { total: 500, quantity: 10 } },
                { itemId: 'item-2', _sum: { total: 200, quantity: 4 } },
            ],
            items: [
                { id: 'item-1', name: 'Widget', code: 'WGT-1' },
                { id: 'item-2', name: 'Gadget', code: 'GDT-1' },
            ],
        }).getDashboardTopItems('t1', { limit: 5 });

        expect(result).toEqual([
            { itemId: 'item-1', itemName: 'Widget', itemCode: 'WGT-1', quantity: 10, revenue: 500 },
            { itemId: 'item-2', itemName: 'Gadget', itemCode: 'GDT-1', quantity: 4, revenue: 200 },
        ]);
    });

    it('returns an empty array when there are no posted sales in range', async () => {
        const result = await makeService({}).getDashboardTopItems('t1', {});
        expect(result).toEqual([]);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- reports.service.spec.ts`
Expected: FAIL — `getDashboardExpenseBreakdown is not a function` (method doesn't exist yet).

- [ ] **Step 3: Implement the two service methods**

Open `apps/api/src/modules/reports/reports.service.ts`. Add these two methods to the `ReportsService` class, immediately after `getDashboardChartData` (before the closing `}` of the class):

```ts
    async getDashboardExpenseBreakdown(tenantId: string, filters?: { from?: string; to?: string }) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const from = filters?.from ? new Date(filters.from) : startOfMonth;
        const to = filters?.to ? new Date(filters.to) : today;

        const grouped = await this.prisma.expenseItem.groupBy({
            by: ['accountId'],
            where: { tenantId, expense: { status: 'POSTED', date: { gte: from, lte: to } } },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
        });

        if (grouped.length === 0) {
            return [];
        }

        const TOP_N = 5;
        const top = grouped.slice(0, TOP_N);
        const rest = grouped.slice(TOP_N);

        const accounts = await this.prisma.chartOfAccount.findMany({
            where: { id: { in: top.map((g) => g.accountId) } },
            select: { id: true, name: true },
        });
        const accountById = new Map(accounts.map((a) => [a.id, a.name]));

        const result = top.map((g) => ({
            accountId: g.accountId,
            accountName: accountById.get(g.accountId) ?? null,
            total: Number(g._sum.amount ?? 0),
        }));

        if (rest.length > 0) {
            const otherTotal = rest.reduce((sum, g) => sum + Number(g._sum.amount ?? 0), 0);
            result.push({
                accountId: 'other',
                accountName: { en: 'Other', ar: 'أخرى' },
                total: otherTotal,
            });
        }

        return result;
    }

    async getDashboardTopItems(tenantId: string, filters?: { from?: string; to?: string; limit?: number }) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const from = filters?.from ? new Date(filters.from) : startOfMonth;
        const to = filters?.to ? new Date(filters.to) : today;
        const limit = filters?.limit ?? 5;

        const grouped = await this.prisma.invoiceLine.groupBy({
            by: ['itemId'],
            where: {
                tenantId,
                invoice: { status: 'POSTED', invoiceType: { direction: 'SALE' }, date: { gte: from, lte: to } },
            },
            _sum: { total: true, quantity: true },
            orderBy: { _sum: { total: 'desc' } },
            take: limit,
        });

        if (grouped.length === 0) {
            return [];
        }

        const items = await this.prisma.item.findMany({
            where: { id: { in: grouped.map((g) => g.itemId) } },
            select: { id: true, name: true, code: true },
        });
        const itemById = new Map(items.map((i) => [i.id, i]));

        return grouped.map((g) => {
            const item = itemById.get(g.itemId);
            return {
                itemId: g.itemId,
                itemName: item?.name ?? '',
                itemCode: item?.code ?? '',
                quantity: Number(g._sum.quantity ?? 0),
                revenue: Number(g._sum.total ?? 0),
            };
        });
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- reports.service.spec.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/reports/reports.service.ts apps/api/src/modules/reports/reports.service.spec.ts
git commit -m "feat(api): add expense-breakdown and top-items dashboard aggregates"
```

---

### Task 2: Backend — expose the two aggregates over HTTP and the API client

**Files:**
- Modify: `apps/api/src/modules/reports/dashboard.controller.ts`
- Modify: `packages/api-client/src/clients/dashboard.client.ts`

**Interfaces:**
- Consumes: `ReportsService.getDashboardExpenseBreakdown`, `ReportsService.getDashboardTopItems` (Task 1)
- Produces: `GET /dashboard/expense-breakdown?from&to`, `GET /dashboard/top-items?from&to&limit` (both `@RequirePermission('dashboard.view')`)
- Produces: `DashboardClient.expenseBreakdown(filters?: DateRangeFilter): Promise<DashboardExpenseBreakdownItem[]>`
- Produces: `DashboardClient.topItems(filters?: DateRangeFilter & { limit?: number }): Promise<DashboardTopItem[]>`
- Produces types: `DashboardExpenseBreakdownItem = { accountId: string; accountName: Record<string, string>; total: number }`, `DashboardTopItem = { itemId: string; itemName: string; itemCode: string; quantity: number; revenue: number }`

- [ ] **Step 1: Add the two routes to `dashboard.controller.ts`**

Open `apps/api/src/modules/reports/dashboard.controller.ts`. Add these two methods inside the `DashboardController` class, after `chartData` (before the closing `}` of the class):

```ts
    @Get('expense-breakdown')
    @RequirePermission('dashboard.view')
    @ApiOperation({
        summary: 'Get dashboard expense breakdown',
        description: 'Posted expense totals grouped by GL account for the selected date range (top 5 + "Other"). Defaults to current calendar month.',
    })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiOkResponse({ description: 'Expense breakdown by account' })
    @ApiStandardErrors()
    async expenseBreakdown(
        @CurrentUser() user: RequestUser,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return ApiResponseBuilder.success(
            await this.reportsService.getDashboardExpenseBreakdown(user.tenantId, { from, to }),
            'Expense breakdown',
        );
    }

    @Get('top-items')
    @RequirePermission('dashboard.view')
    @ApiOperation({
        summary: 'Get dashboard top-selling items',
        description: 'Top items by posted sales revenue for the selected date range. Defaults to current calendar month.',
    })
    @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
    @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Max items to return (default 5, max 10)' })
    @ApiOkResponse({ description: 'Top-selling items' })
    @ApiStandardErrors()
    async topItems(
        @CurrentUser() user: RequestUser,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('limit') limit?: string,
    ) {
        const parsedLimit = limit ? Math.min(10, Math.max(1, parseInt(limit, 10) || 5)) : 5;
        return ApiResponseBuilder.success(
            await this.reportsService.getDashboardTopItems(user.tenantId, { from, to, limit: parsedLimit }),
            'Top items',
        );
    }
```

- [ ] **Step 2: Verify the API app still builds**

Run: `pnpm turbo run build --filter=@devloggers/api`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Add the client methods and types to `dashboard.client.ts`**

Open `packages/api-client/src/clients/dashboard.client.ts`. Read the current file first — it exports `DashboardCashbox`, `DashboardSummaryResponse`, `DashboardChartPoint`, `EMPTY_SUMMARY`, and `DashboardClient`. Add the two new types after `DashboardChartPoint`, and the two new methods inside the `DashboardClient` class after `chartData`:

```ts
export type DashboardExpenseBreakdownItem = {
    accountId: string
    accountName: Record<string, string>
    total: number
}

export type DashboardTopItem = {
    itemId: string
    itemName: string
    itemCode: string
    quantity: number
    revenue: number
}
```

```ts
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
```

- [ ] **Step 4: Verify the api-client package still builds**

Run: `pnpm --filter @devloggers/api-client build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/reports/dashboard.controller.ts packages/api-client/src/clients/dashboard.client.ts
git commit -m "feat(api): expose expense-breakdown and top-items over /dashboard HTTP + client"
```

---

### Task 3: Frontend — prior-period range utility (for KPI trend deltas)

**Files:**
- Create: `apps/dashboard/modules/home/lib/date-range.ts`
- Create: `apps/dashboard/modules/home/lib/date-range.test.ts`

**Interfaces:**
- Produces: `getPriorPeriodRange(from: Date, to: Date): { from: Date; to: Date }` — an equal-length period ending 1ms before `from`.

- [ ] **Step 1: Write the failing test**

Create `apps/dashboard/modules/home/lib/date-range.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { getPriorPeriodRange } from "./date-range"

describe("getPriorPeriodRange", () => {
    it("returns an equal-length period immediately before the given range", () => {
        const from = new Date("2026-09-01T00:00:00.000Z")
        const to = new Date("2026-09-24T00:00:00.000Z")

        const prior = getPriorPeriodRange(from, to)

        expect(prior.to.getTime()).toBe(from.getTime() - 1)
        expect(prior.to.getTime() - prior.from.getTime()).toBe(to.getTime() - from.getTime())
    })

    it("handles a sub-day range", () => {
        const from = new Date("2026-09-24T00:00:00.000Z")
        const to = new Date("2026-09-24T12:00:00.000Z")

        const prior = getPriorPeriodRange(from, to)

        expect(prior.to.getTime()).toBe(from.getTime() - 1)
        expect(prior.from.getTime()).toBe(prior.to.getTime() - (to.getTime() - from.getTime()))
    })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @devloggers/dashboard test:unit -- date-range.test.ts`
Expected: FAIL — cannot find module `./date-range`.

- [ ] **Step 3: Implement the utility**

Create `apps/dashboard/modules/home/lib/date-range.ts`:

```ts
export function getPriorPeriodRange(from: Date, to: Date): { from: Date; to: Date } {
    const durationMs = to.getTime() - from.getTime()
    const priorTo = new Date(from.getTime() - 1)
    const priorFrom = new Date(priorTo.getTime() - durationMs)
    return { from: priorFrom, to: priorTo }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @devloggers/dashboard test:unit -- date-range.test.ts`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/modules/home/lib/date-range.ts apps/dashboard/modules/home/lib/date-range.test.ts
git commit -m "feat(dashboard): add getPriorPeriodRange for KPI trend deltas"
```

---

### Task 4: Frontend — hooks for the two new endpoints

**Files:**
- Create: `apps/dashboard/modules/home/hooks/use-dashboard-expense-breakdown.ts`
- Create: `apps/dashboard/modules/home/hooks/use-dashboard-top-items.ts`
- Modify: `apps/dashboard/modules/home/hooks/index.ts`

**Interfaces:**
- Consumes: `api.dashboard.expenseBreakdown`, `api.dashboard.topItems` (Task 2)
- Produces: `useDashboardExpenseBreakdown(from?: string, to?: string)`, `useDashboardTopItems(from?: string, to?: string, limit?: number)` — both React Query hooks matching the shape of `useDashboardChart`.

- [ ] **Step 1: Create `use-dashboard-expense-breakdown.ts`**

```ts
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardExpenseBreakdown(from?: string, to?: string) {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "expense-breakdown", from, to],
        queryFn: () =>
            api.dashboard.expenseBreakdown(from || to ? { from, to } : undefined),
    })
}
```

- [ ] **Step 2: Create `use-dashboard-top-items.ts`**

```ts
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardTopItems(from?: string, to?: string, limit = 5) {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "top-items", from, to, limit],
        queryFn: () => api.dashboard.topItems({ from, to, limit }),
    })
}
```

- [ ] **Step 3: Update the hooks barrel**

Replace the contents of `apps/dashboard/modules/home/hooks/index.ts`:

```ts
export { useDashboardSummary } from "./use-dashboard-summary"
export { useDashboardChart } from "./use-dashboard-chart"
export { useDashboardMovements } from "./use-dashboard-movements"
export { useDashboardExpenseBreakdown } from "./use-dashboard-expense-breakdown"
export { useDashboardTopItems } from "./use-dashboard-top-items"
```

- [ ] **Step 4: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds (these hooks aren't wired into any component yet, but must typecheck standalone).

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/modules/home/hooks/use-dashboard-expense-breakdown.ts apps/dashboard/modules/home/hooks/use-dashboard-top-items.ts apps/dashboard/modules/home/hooks/index.ts
git commit -m "feat(dashboard): add hooks for expense-breakdown and top-items"
```

---

### Task 5: Frontend — fix `dashboard-cashbox-cards.tsx` (shared localize + token colors)

**Files:**
- Modify: `apps/dashboard/modules/home/components/dashboard-cashbox-cards.tsx`

**Interfaces:**
- Consumes: `localize(value, locale, fallback?)` from `@/shared/lib/localize` (already exists, currently unused here).

- [ ] **Step 1: Replace the file's contents**

Replace the entire contents of `apps/dashboard/modules/home/components/dashboard-cashbox-cards.tsx`:

```tsx
import { WalletIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations, useLocale } from "next-intl"
import type { DashboardCashbox } from "@devloggers/api-client"
import { localize } from "@/shared/lib/localize"

const BORDER_COLORS = [
    "border-s-[var(--chart-1)]",
    "border-s-[var(--chart-2)]",
    "border-s-[var(--chart-3)]",
    "border-s-[var(--chart-4)]",
    "border-s-[var(--chart-5)]",
]

interface DashboardCashboxCardsProps {
    cashboxes: DashboardCashbox[]
    isLoading: boolean
}

export function DashboardCashboxCards({
    cashboxes,
    isLoading,
}: DashboardCashboxCardsProps) {
    const t = useTranslations("business.dashboard.cashboxes")
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
                                      {localize(cashbox.name, locale)}
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

- [ ] **Step 2: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-cashbox-cards.tsx
git commit -m "refactor(dashboard): adopt shared localize() and chart tokens in cashbox cards"
```

---

### Task 6: Frontend — fix `dashboard-recent-payments.tsx` (remove `any`, fix cashbox-name bug)

**Files:**
- Modify: `apps/dashboard/modules/home/components/dashboard-recent-payments.tsx`

**Context:** `payment.cashbox?.name` does not exist on the real API response (`PaymentResponseDto` flattens this to `cashboxName?: string` — see `apps/api/src/modules/invoicing/payments/presenters/payment.presenter.ts:27`). The `any` typing on the row was hiding this: the Cashbox column has been silently rendering "—" for every row. This step fixes both the type and the bug in one edit.

- [ ] **Step 1: Replace the file's contents**

Replace the entire contents of `apps/dashboard/modules/home/components/dashboard-recent-payments.tsx`:

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
    const t = useTranslations("business.dashboard.recentPayments")
    const { data, isLoading } = useDashboardMovements()

    const payments = data?.data ?? []

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
                            {payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(payment.date), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {payment.number}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={TYPE_VARIANT[payment.type] ?? "secondary"}>
                                            {t(payment.type.toLowerCase() as "receipt" | "payment" | "adjustment")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {payment.cashboxName || "—"}
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

- [ ] **Step 2: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds. If `payment.type` or `payment.cashboxName` fail to typecheck, run `pnpm generate:dev` first (API must be running) to refresh generated types, then rebuild.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-recent-payments.tsx
git commit -m "fix(dashboard): recent payments now show the real cashbox name, remove any typing"
```

---

### Task 7: Frontend — fix `dashboard-items-overview.tsx` (relabel + token colors)

**Files:**
- Modify: `apps/dashboard/modules/home/components/dashboard-items-overview.tsx`

**Context:** The second stat was labeled "Total" but rendered `totalActiveParties`, linking to `/parties/customers`. This step relabels it to what it actually shows instead of what it claims to show.

- [ ] **Step 1: Replace the file's contents**

Replace the entire contents of `apps/dashboard/modules/home/components/dashboard-items-overview.tsx`:

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
    const t = useTranslations("business.dashboard.itemsOverview")

    const stats = [
        {
            label: t("active"),
            value: data?.totalActiveItems ?? 0,
            href: "/catalog/items",
            colorClass: "text-[var(--chart-1)]",
        },
        {
            label: t("activeParties"),
            value: data?.totalActiveParties ?? 0,
            href: "/parties/customers",
            colorClass: "text-[var(--chart-2)]",
        },
        {
            label: t("outOfStock"),
            value: data?.lowStockItemsCount ?? 0,
            href: "/inventory/stock-balances",
            colorClass: "text-destructive",
        },
    ]

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PackageIcon className="h-4 w-4 text-[var(--chart-1)]" />
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

- [ ] **Step 2: Add the new `activeParties` i18n key placeholder note**

This key (`business.dashboard.itemsOverview.activeParties`) is added to all three locale files in Task 17. Do not run the app relying on this string until Task 17 lands — `next-intl` will render the key path as a fallback string, which is fine for a mid-plan intermediate state.

- [ ] **Step 3: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds (missing i18n keys are a runtime/dev warning, not a build error, in this app's next-intl setup — confirm this holds by checking for a build-time i18n key checker; if the build fails on missing keys, do Task 17's i18n edits for this file's keys now instead of deferring).

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-items-overview.tsx
git commit -m "fix(dashboard): relabel items-overview stat to match the data it shows"
```

---

### Task 8: Frontend — new `DashboardKpiDelta` trend-chip component

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-kpi-delta.tsx`

**Interfaces:**
- Produces: `DashboardKpiDelta({ current: number; previous: number; higherIsBetter?: boolean })` — renders nothing if `previous` is 0, a flat dash if change < 0.05%, else an up/down arrow with `%` colored `text-success`/`text-destructive`.

- [ ] **Step 1: Create the component**

```tsx
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface DashboardKpiDeltaProps {
    current: number
    previous: number
    /** false for metrics where a rise is unfavorable (e.g. expenses, purchases). */
    higherIsBetter?: boolean
}

export function DashboardKpiDelta({ current, previous, higherIsBetter = true }: DashboardKpiDeltaProps) {
    if (previous === 0) {
        return null
    }

    const change = ((current - previous) / Math.abs(previous)) * 100
    const isFlat = Math.abs(change) < 0.05

    if (isFlat) {
        return <span className="text-xs text-muted-foreground">—</span>
    }

    const isUp = change > 0
    const isFavorable = isUp === higherIsBetter
    const Icon = isUp ? ArrowUpIcon : ArrowDownIcon

    return (
        <span
            className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                isFavorable ? "text-success" : "text-destructive",
            )}
        >
            <Icon className="h-3 w-3" />
            {Math.abs(change).toFixed(1)}%
        </span>
    )
}
```

- [ ] **Step 2: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds (component isn't wired in yet, must typecheck standalone).

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-kpi-delta.tsx
git commit -m "feat(dashboard): add DashboardKpiDelta trend-chip component"
```

---

### Task 9: Frontend — wire trend deltas + token colors into `dashboard-kpi-cards.tsx`

**Files:**
- Modify: `apps/dashboard/modules/home/components/dashboard-kpi-cards.tsx`

**Interfaces:**
- Consumes: `DashboardKpiDelta` (Task 8)
- Produces: `DashboardKpiCards({ data, previousData, isLoading })` — note the new required `previousData` prop (breaking change for this component's props, fixed up in Task 16).

- [ ] **Step 1: Replace the file's contents**

Replace the entire contents of `apps/dashboard/modules/home/components/dashboard-kpi-cards.tsx`:

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
import { DashboardKpiDelta } from "./dashboard-kpi-delta"

interface DashboardKpiCardsProps {
    data: DashboardSummaryResponse | undefined
    previousData: DashboardSummaryResponse | undefined
    isLoading: boolean
}

function formatNumber(value: number) {
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value)
}

export function DashboardKpiCards({ data, previousData, isLoading }: DashboardKpiCardsProps) {
    const t = useTranslations("business.dashboard.kpi")

    const cards = [
        {
            label: t("totalSales"),
            value: data?.totalSales ?? 0,
            previousValue: previousData?.totalSales ?? 0,
            higherIsBetter: true,
            icon: TrendingUp,
            iconClass: "text-[var(--chart-1)]",
        },
        {
            label: t("totalPurchases"),
            value: data?.totalPurchases ?? 0,
            previousValue: previousData?.totalPurchases ?? 0,
            higherIsBetter: false,
            icon: ShoppingCart,
            iconClass: "text-[var(--chart-2)]",
        },
        {
            label: t("netProfit"),
            value: data?.netProfit ?? 0,
            previousValue: previousData?.netProfit ?? 0,
            higherIsBetter: true,
            icon: LineChart,
            iconClass: "text-[var(--chart-4)]",
        },
        {
            label: t("totalExpenses"),
            value: data?.totalExpenses ?? 0,
            previousValue: previousData?.totalExpenses ?? 0,
            higherIsBetter: false,
            icon: CreditCard,
            iconClass: "text-[var(--chart-3)]",
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
                                <div className="flex items-baseline gap-2">
                                    <div className="text-2xl font-bold">
                                        {formatNumber(card.value)}
                                    </div>
                                    <DashboardKpiDelta
                                        current={card.value}
                                        previous={card.previousValue}
                                        higherIsBetter={card.higherIsBetter}
                                    />
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

- [ ] **Step 2: Verify the dashboard app build**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: FAILS at this point — `dashboard-content.tsx` (not yet updated, Task 16) still calls `<DashboardKpiCards data isLoading />` without `previousData`. This is expected; the component tree is only fully consistent again after Task 16. Confirm the failure is specifically a missing-prop error on `DashboardKpiCards` in `dashboard-content.tsx`, and no other error — if there is a different error, fix it before proceeding.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-kpi-cards.tsx
git commit -m "feat(dashboard): add trend deltas and token colors to KPI cards"
```

---

### Task 10: Frontend — restyle `dashboard-chart.tsx` onto ChartContainer + tokens

**Files:**
- Modify: `apps/dashboard/modules/home/components/dashboard-chart.tsx`

**Interfaces:**
- Consumes: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `type ChartConfig` from `@/shared/components/ui/chart`.

- [ ] **Step 1: Replace the file's contents**

Replace the entire contents of `apps/dashboard/modules/home/components/dashboard-chart.tsx`:

```tsx
"use client"

import * as React from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/shared/components/ui/chart"
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

function formatCompact(value: number) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}

type EndLabelProps = {
    x?: number
    y?: number
    index?: number
    value?: number
}

function makeEndLabel(lastIndex: number) {
    return function EndLabel({ x, y, index, value }: EndLabelProps) {
        if (index !== lastIndex || x === undefined || y === undefined || value === undefined) {
            return null
        }
        return (
            <text x={x} y={y - 10} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                {formatCompact(value)}
            </text>
        )
    }
}

export function DashboardChart({ data, isLoading }: DashboardChartProps) {
    const t = useTranslations("business.dashboard.chart")
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = data.map((point) => ({
        ...point,
        date: formatDate(point.date),
    }))

    const chartConfig = {
        sales: { label: t("sales"), color: "var(--chart-1)" },
        purchases: { label: t("purchases"), color: "var(--chart-2)" },
    } satisfies ChartConfig

    const EndLabel = makeEndLabel(chartData.length - 1)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading || !mounted ? (
                    <Skeleton className="h-[320px] w-full" />
                ) : chartData.length === 0 ? (
                    <div className="flex h-[320px] w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <p className="text-sm">{t("empty")}</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full" dir="ltr">
                        <AreaChart data={chartData} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-purchases)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--color-purchases)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={70}
                                tickFormatter={formatCompact}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Area
                                type="monotone"
                                dataKey="sales"
                                stroke="var(--color-sales)"
                                strokeWidth={2}
                                fill="url(#colorSales)"
                                label={EndLabel}
                            />
                            <Area
                                type="monotone"
                                dataKey="purchases"
                                stroke="var(--color-purchases)"
                                strokeWidth={2}
                                fill="url(#colorPurchases)"
                                label={EndLabel}
                            />
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
```

- [ ] **Step 2: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds (this component's own props didn't change, so this should build cleanly even before Task 16).

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-chart.tsx
git commit -m "refactor(dashboard): restyle sales/purchases chart onto ChartContainer + tokens"
```

---

### Task 11: Frontend — token-based hover colors in `dashboard-quick-actions.tsx`

**Files:**
- Modify: `apps/dashboard/modules/home/components/dashboard-quick-actions.tsx`

**Context:** Position and structure are unchanged — only the four hardcoded hover colors change, to the same `--chart-1..4` mapping used everywhere else on the page (sales→chart-1, purchases→chart-2, receipts→chart-4, expenses→chart-3).

- [ ] **Step 1: Replace the file's contents**

Replace the entire contents of `apps/dashboard/modules/home/components/dashboard-quick-actions.tsx`:

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
        hoverClass: "hover:border-[var(--chart-1)] hover:text-[var(--chart-1)]",
    },
    {
        key: "purchaseInvoice" as const,
        href: "/purchases/invoices?action=create",
        icon: ShoppingCartIcon,
        hoverClass: "hover:border-[var(--chart-2)] hover:text-[var(--chart-2)]",
    },
    {
        key: "receipt" as const,
        href: "/finance/payments?action=create&type=RECEIPT",
        icon: HandCoinsIcon,
        hoverClass: "hover:border-[var(--chart-4)] hover:text-[var(--chart-4)]",
    },
    {
        key: "expense" as const,
        href: "/finance/expenses?action=create",
        icon: CreditCardIcon,
        hoverClass: "hover:border-[var(--chart-3)] hover:text-[var(--chart-3)]",
    },
]

export function DashboardQuickActions() {
    const t = useTranslations("business.dashboard.quickActions")

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

- [ ] **Step 2: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-quick-actions.tsx
git commit -m "refactor(dashboard): move quick-action hover accents onto chart tokens"
```

---

### Task 12: Frontend — new `DashboardCashDistribution` donut chart

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-cash-distribution.tsx`

**Context:** Cashboxes can be in different currencies (`Cashbox.balance` is in the cashbox's own currency, not a tenant base currency — see `packages/db-prisma/src/schema/cashbox.prisma:22`). Summing balances across currencies into one pie would misrepresent the data, so this groups by currency and renders one small donut per currency present (a single donut in the common single-currency case).

**Interfaces:**
- Consumes: `localize` from `@/shared/lib/localize`, `ChartContainer`/`ChartTooltip`/`ChartTooltipContent`/`ChartConfig` from `@/shared/components/ui/chart`.
- Produces: `DashboardCashDistribution({ cashboxes: DashboardCashbox[]; isLoading: boolean })`.

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { Pie, PieChart, Cell } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { localize } from "@/shared/lib/localize"
import type { DashboardCashbox } from "@devloggers/api-client"

const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

interface DashboardCashDistributionProps {
    cashboxes: DashboardCashbox[]
    isLoading: boolean
}

interface CurrencyGroup {
    currencyCode: string
    currencySymbol: string
    slices: { name: string; value: number }[]
    total: number
}

function groupByCurrency(cashboxes: DashboardCashbox[], locale: string): CurrencyGroup[] {
    const groups = new Map<string, CurrencyGroup>()

    for (const cashbox of cashboxes) {
        const balance = Number(cashbox.balance)
        if (balance <= 0) continue

        const code = cashbox.currency.code
        const group = groups.get(code) ?? {
            currencyCode: code,
            currencySymbol: cashbox.currency.symbol,
            slices: [],
            total: 0,
        }
        group.slices.push({ name: localize(cashbox.name, locale), value: balance })
        group.total += balance
        groups.set(code, group)
    }

    return Array.from(groups.values())
}

export function DashboardCashDistribution({ cashboxes, isLoading }: DashboardCashDistributionProps) {
    const t = useTranslations("business.dashboard.cashDistribution")
    const locale = useLocale()

    const groups = groupByCurrency(cashboxes, locale)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-[240px] w-full" />
                ) : groups.length === 0 ? (
                    <div className="flex h-[240px] w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <p className="text-sm">{t("empty")}</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center gap-6">
                        {groups.map((group) => {
                            const chartConfig = Object.fromEntries(
                                group.slices.map((slice, i) => [
                                    slice.name,
                                    { label: slice.name, color: SLICE_COLORS[i % SLICE_COLORS.length] },
                                ]),
                            ) satisfies ChartConfig

                            return (
                                <div key={group.currencyCode} className="flex flex-col items-center gap-2">
                                    <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-[180px]">
                                        <PieChart>
                                            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                                            <Pie
                                                data={group.slices}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={45}
                                                outerRadius={70}
                                                strokeWidth={2}
                                            >
                                                {group.slices.map((slice, i) => (
                                                    <Cell key={slice.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ChartContainer>
                                    <p className="text-sm font-medium">
                                        {group.currencySymbol}{" "}
                                        {new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
                                            group.total,
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{group.currencyCode}</p>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
```

- [ ] **Step 2: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds (not wired in yet, must typecheck standalone).

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-cash-distribution.tsx
git commit -m "feat(dashboard): add cash distribution donut, grouped by currency"
```

---

### Task 13: Frontend — new `DashboardRevenueBreakdown` composition chart

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-revenue-breakdown.tsx`

**Interfaces:**
- Produces: `DashboardRevenueBreakdown({ data: DashboardSummaryResponse | undefined; isLoading: boolean })`.

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import type { DashboardSummaryResponse } from "@devloggers/api-client"

interface DashboardRevenueBreakdownProps {
    data: DashboardSummaryResponse | undefined
    isLoading: boolean
}

function formatCompact(value: number) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}

export function DashboardRevenueBreakdown({ data, isLoading }: DashboardRevenueBreakdownProps) {
    const t = useTranslations("business.dashboard.revenueBreakdown")

    const rows = [
        { key: "sales", label: t("sales"), value: data?.totalSales ?? 0, color: "var(--chart-1)" },
        { key: "purchases", label: t("purchases"), value: data?.totalPurchases ?? 0, color: "var(--chart-2)" },
        { key: "expenses", label: t("expenses"), value: data?.totalExpenses ?? 0, color: "var(--chart-3)" },
        { key: "netProfit", label: t("netProfit"), value: data?.netProfit ?? 0, color: "var(--chart-4)" },
    ]

    const chartConfig = Object.fromEntries(
        rows.map((row) => [row.key, { label: row.label, color: row.color }]),
    ) satisfies ChartConfig

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
                        <BarChart data={rows} layout="vertical" margin={{ left: 12 }}>
                            <XAxis type="number" tickFormatter={formatCompact} fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="label" fontSize={12} tickLine={false} axisLine={false} width={90} />
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="value" radius={4}>
                                {rows.map((row) => (
                                    <Cell key={row.key} fill={row.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
```

- [ ] **Step 2: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-revenue-breakdown.tsx
git commit -m "feat(dashboard): add revenue/cost/expense/profit breakdown chart"
```

---

### Task 14: Frontend — new `DashboardExpenseBreakdown` chart

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-expense-breakdown.tsx`

**Interfaces:**
- Consumes: `DashboardExpenseBreakdownItem` type (Task 2), `localize` from `@/shared/lib/localize`.
- Produces: `DashboardExpenseBreakdown({ data: DashboardExpenseBreakdownItem[] | undefined; isLoading: boolean })`.

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { localize } from "@/shared/lib/localize"
import type { DashboardExpenseBreakdownItem } from "@devloggers/api-client"

const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const OTHER_COLOR = "var(--muted-foreground)"

interface DashboardExpenseBreakdownProps {
    data: DashboardExpenseBreakdownItem[] | undefined
    isLoading: boolean
}

function formatCompact(value: number) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}

export function DashboardExpenseBreakdown({ data, isLoading }: DashboardExpenseBreakdownProps) {
    const t = useTranslations("business.dashboard.expenseBreakdown")
    const locale = useLocale()

    const rows = (data ?? []).map((item, i) => ({
        key: item.accountId,
        label: localize(item.accountName, locale),
        value: item.total,
        color: item.accountId === "other" ? OTHER_COLOR : SLICE_COLORS[i % SLICE_COLORS.length],
    }))

    const chartConfig = Object.fromEntries(
        rows.map((row) => [row.key, { label: row.label, color: row.color }]),
    ) satisfies ChartConfig

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                ) : rows.length === 0 ? (
                    <div className="flex h-[220px] w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <p className="text-sm">{t("empty")}</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
                        <BarChart data={rows} layout="vertical" margin={{ left: 12 }}>
                            <XAxis type="number" tickFormatter={formatCompact} fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="label" fontSize={12} tickLine={false} axisLine={false} width={110} />
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="value" radius={4}>
                                {rows.map((row) => (
                                    <Cell key={row.key} fill={row.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
```

- [ ] **Step 2: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-expense-breakdown.tsx
git commit -m "feat(dashboard): add expenses-by-account chart"
```

---

### Task 15: Frontend — new `DashboardTopItems` ranking chart

**Files:**
- Create: `apps/dashboard/modules/home/components/dashboard-top-items.tsx`

**Interfaces:**
- Consumes: `DashboardTopItem` type (Task 2).
- Produces: `DashboardTopItems({ data: DashboardTopItem[] | undefined; isLoading: boolean })`.

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import type { DashboardTopItem } from "@devloggers/api-client"

function formatCompact(value: number) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}

interface DashboardTopItemsProps {
    data: DashboardTopItem[] | undefined
    isLoading: boolean
}

export function DashboardTopItems({ data, isLoading }: DashboardTopItemsProps) {
    const t = useTranslations("business.dashboard.topItems")

    const chartConfig = {
        revenue: { label: t("revenue"), color: "var(--chart-1)" },
    } satisfies ChartConfig

    const rows = (data ?? []).map((item) => ({
        key: item.itemId,
        label: item.itemName || item.itemCode,
        revenue: item.revenue,
    }))

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                ) : rows.length === 0 ? (
                    <div className="flex h-[220px] w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <p className="text-sm">{t("empty")}</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
                        <BarChart data={rows} layout="vertical" margin={{ left: 12 }}>
                            <XAxis type="number" tickFormatter={formatCompact} fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="label" fontSize={12} tickLine={false} axisLine={false} width={110} />
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
```

- [ ] **Step 2: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/components/dashboard-top-items.tsx
git commit -m "feat(dashboard): add top-selling-items ranking chart"
```

---

### Task 16: Frontend — final `dashboard-content.tsx` composition

**Files:**
- Modify: `apps/dashboard/modules/home/dashboard-content.tsx`

**Context:** This is the task that makes the tree consistent again — it wires `previousData` into `DashboardKpiCards` (Task 9), and composes all four new chart components (Tasks 12–15) into the page. New layout order: KPIs → Quick Actions (now 2nd, was 3rd) → Sales/Purchases chart + Low Stock → Cash Distribution + Revenue Breakdown → Cashbox cards → Expense Breakdown + Top Items → Recent Payments + Items Overview.

**Interfaces:**
- Consumes: `getPriorPeriodRange` (Task 3), `useDashboardExpenseBreakdown`/`useDashboardTopItems` (Task 4), `DashboardCashDistribution`/`DashboardRevenueBreakdown`/`DashboardExpenseBreakdown`/`DashboardTopItems` (Tasks 12–15), updated `DashboardKpiCards` (Task 9).

- [ ] **Step 1: Replace the file's contents**

Replace the entire contents of `apps/dashboard/modules/home/dashboard-content.tsx`:

```tsx
"use client"

import * as React from "react"
import { startOfMonth } from "date-fns"
import { useTranslations } from "next-intl"
import DashboardPage from "@/infrastructure/components/layout/dashboard/dashboard-page"
import { DashboardDateRangePicker } from "./components/dashboard-date-range-picker"
import { DashboardKpiCards } from "./components/dashboard-kpi-cards"
import { DashboardCashboxCards } from "./components/dashboard-cashbox-cards"
import { DashboardCashDistribution } from "./components/dashboard-cash-distribution"
import { DashboardRevenueBreakdown } from "./components/dashboard-revenue-breakdown"
import { DashboardQuickActions } from "./components/dashboard-quick-actions"
import { DashboardChart } from "./components/dashboard-chart"
import { DashboardExpenseBreakdown } from "./components/dashboard-expense-breakdown"
import { DashboardTopItems } from "./components/dashboard-top-items"
import { DashboardLowStock } from "./components/dashboard-low-stock"
import { DashboardRecentPayments } from "./components/dashboard-recent-payments"
import { DashboardItemsOverview } from "./components/dashboard-items-overview"
import { useDashboardSummary } from "./hooks/use-dashboard-summary"
import { useDashboardChart } from "./hooks/use-dashboard-chart"
import { useDashboardExpenseBreakdown } from "./hooks/use-dashboard-expense-breakdown"
import { useDashboardTopItems } from "./hooks/use-dashboard-top-items"
import { getPriorPeriodRange } from "./lib/date-range"

export function DashboardContent() {
    const t = useTranslations("business.dashboard")

    const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: new Date(),
    })

    const fromIso = dateRange.from.toISOString()
    const toIso = dateRange.to.toISOString()

    const priorRange = getPriorPeriodRange(dateRange.from, dateRange.to)
    const priorFromIso = priorRange.from.toISOString()
    const priorToIso = priorRange.to.toISOString()

    const summary = useDashboardSummary(fromIso, toIso)
    const previousSummary = useDashboardSummary(priorFromIso, priorToIso)
    const chart = useDashboardChart(fromIso, toIso)
    const expenseBreakdown = useDashboardExpenseBreakdown(fromIso, toIso)
    const topItems = useDashboardTopItems(fromIso, toIso)

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
                <DashboardKpiCards
                    data={summary.data}
                    previousData={previousSummary.data}
                    isLoading={summary.isLoading}
                />

                <DashboardQuickActions />

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

                <div className="grid gap-4 md:grid-cols-2">
                    <DashboardCashDistribution
                        cashboxes={summary.data?.cashboxes ?? []}
                        isLoading={summary.isLoading}
                    />
                    <DashboardRevenueBreakdown
                        data={summary.data}
                        isLoading={summary.isLoading}
                    />
                </div>

                <DashboardCashboxCards
                    cashboxes={summary.data?.cashboxes ?? []}
                    isLoading={summary.isLoading}
                />

                <div className="grid gap-4 md:grid-cols-2">
                    <DashboardExpenseBreakdown
                        data={expenseBreakdown.data}
                        isLoading={expenseBreakdown.isLoading}
                    />
                    <DashboardTopItems
                        data={topItems.data}
                        isLoading={topItems.isLoading}
                    />
                </div>

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

- [ ] **Step 2: Verify the dashboard app builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds — this is the task where the whole component tree becomes consistent again (Task 9's `previousData` prop is now supplied).

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/home/dashboard-content.tsx
git commit -m "feat(dashboard): compose the redesigned home page layout"
```

---

### Task 17: i18n — add every new/changed string to en, ar, tr

**Files:**
- Modify: `packages/i18n/src/en/business.json`
- Modify: `packages/i18n/src/ar/business.json`
- Modify: `packages/i18n/src/tr/business.json`

**Context:** The existing `dashboard` subtree (read in design) has keys under `title`, `description`, `dateRangePlaceholder`, `kpi`, `cashboxes`, `quickActions`, `chart`, `lowStock`, `recentPayments`, `itemsOverview`. This task adds: `chart.empty`, `itemsOverview.activeParties`, plus four new subtrees: `cashDistribution`, `revenueBreakdown`, `expenseBreakdown`, `topItems`.

- [ ] **Step 1: Read the current `dashboard` subtree in each locale file**

Run for each locale to see the exact current structure before editing:

```bash
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('packages/i18n/src/en/business.json','utf-8')).dashboard, null, 2))"
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('packages/i18n/src/ar/business.json','utf-8')).dashboard, null, 2))"
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('packages/i18n/src/tr/business.json','utf-8')).dashboard, null, 2))"
```

- [ ] **Step 2: Edit `packages/i18n/src/en/business.json`**

Inside the `dashboard` object:
- Add `"empty": "No sales or purchases in this period yet."` to the `chart` sub-object.
- Add `"activeParties": "Active Parties"` to the `itemsOverview` sub-object.
- Add these four new sibling keys to `dashboard` (alongside `chart`, `lowStock`, etc.):

```json
"cashDistribution": {
    "title": "Cash Distribution",
    "description": "Balance composition across your cashboxes.",
    "empty": "No cashbox balances to show yet."
},
"revenueBreakdown": {
    "title": "Revenue Breakdown",
    "description": "Sales, purchases, expenses, and net profit for the selected period.",
    "sales": "Sales",
    "purchases": "Purchases",
    "expenses": "Expenses",
    "netProfit": "Net Profit"
},
"expenseBreakdown": {
    "title": "Expenses by Account",
    "description": "Where posted expenses went this period.",
    "empty": "No posted expenses in this period yet."
},
"topItems": {
    "title": "Top Selling Items",
    "description": "Highest-revenue items for the selected period.",
    "revenue": "Revenue",
    "empty": "No posted sales in this period yet."
}
```

- [ ] **Step 3: Edit `packages/i18n/src/ar/business.json`**

Same keys, Arabic values:

```json
"empty": "لا توجد مبيعات أو مشتريات في هذه الفترة بعد."
```
(inside `chart`)

```json
"activeParties": "الأطراف النشطة"
```
(inside `itemsOverview`)

```json
"cashDistribution": {
    "title": "توزيع النقدية",
    "description": "تركيبة الأرصدة عبر صناديق النقدية.",
    "empty": "لا توجد أرصدة صناديق لعرضها بعد."
},
"revenueBreakdown": {
    "title": "تفصيل الإيرادات",
    "description": "المبيعات والمشتريات والمصروفات وصافي الربح للفترة المحددة.",
    "sales": "المبيعات",
    "purchases": "المشتريات",
    "expenses": "المصروفات",
    "netProfit": "صافي الربح"
},
"expenseBreakdown": {
    "title": "المصروفات حسب الحساب",
    "description": "وجهة المصروفات المرحّلة لهذه الفترة.",
    "empty": "لا توجد مصروفات مرحّلة في هذه الفترة بعد."
},
"topItems": {
    "title": "الأصناف الأكثر مبيعًا",
    "description": "الأصناف الأعلى إيرادًا للفترة المحددة.",
    "revenue": "الإيراد",
    "empty": "لا توجد مبيعات مرحّلة في هذه الفترة بعد."
}
```

- [ ] **Step 4: Edit `packages/i18n/src/tr/business.json`**

Same keys, Turkish values:

```json
"empty": "Bu dönemde henüz satış veya alış yok."
```
(inside `chart`)

```json
"activeParties": "Aktif Cariler"
```
(inside `itemsOverview`)

```json
"cashDistribution": {
    "title": "Nakit Dağılımı",
    "description": "Kasalarınız arasındaki bakiye dağılımı.",
    "empty": "Henüz gösterilecek kasa bakiyesi yok."
},
"revenueBreakdown": {
    "title": "Gelir Dağılımı",
    "description": "Seçilen dönem için satışlar, alışlar, giderler ve net kâr.",
    "sales": "Satışlar",
    "purchases": "Alışlar",
    "expenses": "Giderler",
    "netProfit": "Net Kâr"
},
"expenseBreakdown": {
    "title": "Hesaba Göre Giderler",
    "description": "Bu dönemde işlenmiş giderlerin dağılımı.",
    "empty": "Bu dönemde henüz işlenmiş gider yok."
},
"topItems": {
    "title": "En Çok Satan Ürünler",
    "description": "Seçilen dönem için en yüksek gelirli ürünler.",
    "revenue": "Gelir",
    "empty": "Bu dönemde henüz işlenmiş satış yok."
}
```

- [ ] **Step 5: Validate all three files are valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('packages/i18n/src/en/business.json','utf-8')); console.log('en OK')"
node -e "JSON.parse(require('fs').readFileSync('packages/i18n/src/ar/business.json','utf-8')); console.log('ar OK')"
node -e "JSON.parse(require('fs').readFileSync('packages/i18n/src/tr/business.json','utf-8')); console.log('tr OK')"
```

Expected: all three print `OK` with no `SyntaxError`.

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/src/en/business.json packages/i18n/src/ar/business.json packages/i18n/src/tr/business.json
git commit -m "i18n: add dashboard redesign strings for en, ar, tr"
```

---

### Task 18: Cleanup — delete the 10 orphaned home-module files

**Files:**
- Delete: `apps/dashboard/modules/home/appointments-summary-card.tsx`
- Delete: `apps/dashboard/modules/home/customers-totals-card.tsx`
- Delete: `apps/dashboard/modules/home/financial-summary-chart.tsx`
- Delete: `apps/dashboard/modules/home/financial-totals-cards.tsx`
- Delete: `apps/dashboard/modules/home/income-expense-chart.tsx`
- Delete: `apps/dashboard/modules/home/items-totals-card.tsx`
- Delete: `apps/dashboard/modules/home/sales-purchase-cards.tsx`
- Delete: `apps/dashboard/modules/home/upcoming-appointments-card.tsx`
- Delete: `apps/dashboard/modules/home/use-dashboard-data.ts`
- Delete: `apps/dashboard/modules/home/vehicle-stats-cards.tsx`
- Delete: `apps/dashboard/modules/home/work-orders-status-card.tsx`

- [ ] **Step 1: Re-confirm none of these are imported anywhere before deleting**

```bash
grep -rl "appointments-summary-card\|customers-totals-card\|financial-summary-chart\|financial-totals-cards\|income-expense-chart\|items-totals-card\|sales-purchase-cards\|upcoming-appointments-card\|use-dashboard-data\|vehicle-stats-cards\|work-orders-status-card" apps/dashboard --include="*.ts" --include="*.tsx" | grep -v "^apps/dashboard/modules/home/\(appointments-summary-card\|customers-totals-card\|financial-summary-chart\|financial-totals-cards\|income-expense-chart\|items-totals-card\|sales-purchase-cards\|upcoming-appointments-card\|use-dashboard-data\|vehicle-stats-cards\|work-orders-status-card\)"
```

Expected: empty output (no other file references any of these ten by name).

- [ ] **Step 2: Delete the files**

```bash
git rm apps/dashboard/modules/home/appointments-summary-card.tsx \
       apps/dashboard/modules/home/customers-totals-card.tsx \
       apps/dashboard/modules/home/financial-summary-chart.tsx \
       apps/dashboard/modules/home/financial-totals-cards.tsx \
       apps/dashboard/modules/home/income-expense-chart.tsx \
       apps/dashboard/modules/home/items-totals-card.tsx \
       apps/dashboard/modules/home/sales-purchase-cards.tsx \
       apps/dashboard/modules/home/upcoming-appointments-card.tsx \
       apps/dashboard/modules/home/use-dashboard-data.ts \
       apps/dashboard/modules/home/vehicle-stats-cards.tsx \
       apps/dashboard/modules/home/work-orders-status-card.tsx
```

- [ ] **Step 3: Verify the dashboard app still builds**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Build succeeds (confirms nothing depended on the deleted files).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(dashboard): remove 10 orphaned files from an unrelated template"
```

(The `git rm` in Step 2 already staged the deletions — this commit just finalizes them.)

---

### Task 19: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full API build**

Run: `pnpm turbo run build --filter=@devloggers/api`
Expected: Success, no TypeScript errors.

- [ ] **Step 2: API tests**

Run: `pnpm --filter @devloggers/api test -- reports.service.spec.ts`
Expected: All tests pass.

- [ ] **Step 3: Regenerate OpenAPI types**

Run: `pnpm generate` (from repo root — bootstraps NestJS without a running server/DB, per `.ai/rules/api.md`)
Expected: Succeeds; confirms the two new routes don't accidentally break spec generation even though they stay DTO-free like their siblings.

- [ ] **Step 4: api-client build**

Run: `pnpm --filter @devloggers/api-client build`
Expected: Success.

- [ ] **Step 5: Full dashboard build**

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: Success.

- [ ] **Step 6: Dashboard unit tests**

Run: `pnpm --filter @devloggers/dashboard test:unit -- date-range.test.ts`
Expected: All tests pass.

- [ ] **Step 7: Dashboard lint**

Run: `pnpm --filter @devloggers/dashboard lint`
Expected: No new lint errors introduced by this plan's files.

- [ ] **Step 8: Manual smoke test**

Start both apps (`pnpm --filter @devloggers/api dev` and `pnpm --filter @devloggers/dashboard dev` in separate terminals), open the home page, and confirm:
- All charts render with real tenant data, light and dark mode.
- KPI cards show a trend chip with correct up/down color per metric.
- Cash Distribution donut renders (single donut for a single-currency tenant; one donut per currency for a multi-currency tenant).
- Expense-by-account and Top-items charts show data for a tenant with posted expenses/sales, and the designed empty state for one without.
- Recent Payments table's Cashbox column now shows real names (previously always blank).
- Quick Actions are visible immediately below the KPI row, unchanged in behavior.
- Switch to `ar` locale: layout mirrors correctly, all new strings are in Arabic, numbers/dates in charts stay LTR.

- [ ] **Step 9: Final commit (if the smoke test required fixes)**

```bash
git add -A
git commit -m "fix(dashboard): address smoke-test findings from home page redesign"
```

(Skip this step if no fixes were needed.)

---

## Self-review notes

- **Spec coverage:** every functional requirement in `docs/superpowers/specs/2026-09-24-dashboard-home-redesign-design.md` maps to a task above (trend deltas → Tasks 8–9; cash distribution → Task 12; revenue breakdown → Task 13; two new endpoints → Tasks 1–2; expense-by-account chart → Task 14; top-items chart → Task 15; chart restyle → Task 10; token colors on KPIs/quick-actions → Tasks 9/11; deletions → Task 18; `any`/mislabel fixes → Tasks 6–7; i18n → Task 17; final composition → Task 16; verification → Task 19).
- **Type consistency check:** `DashboardKpiCards` prop rename (`previousData` added) is introduced in Task 9 and consumed in Task 16 — flagged explicitly as an expected transient build failure between those two tasks so a reviewer doesn't mistake it for a bug. `DashboardExpenseBreakdownItem`/`DashboardTopItem` types are defined once (Task 2) and imported by name, unchanged, in Tasks 14–15. `getPriorPeriodRange` signature (Task 3) matches its call site in Task 16 exactly.
- **No placeholders:** every step has complete, runnable code — no "add appropriate styling" or "similar to Task N" shortcuts.
