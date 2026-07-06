# Chart of Accounts Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate chart of accounts into lightweight tree endpoint (fast navigation) and enhanced balances endpoint (accurate roll-ups with both own and rolled balances displayed).

**Architecture:** New `GET /accounting/chart-of-accounts/tree` endpoint returns account structure without balance computation. Existing `GET /accounting/account-balances` endpoint is fixed to correctly roll up child balances to parents. Frontend uses two separate hooks: `useAccountTree()` for tree navigation and `useAccountBalances()` for main panel display.

**Tech Stack:** NestJS, Prisma, React Query, TypeScript, Next.js

## Global Constraints

- Follow existing code patterns in the monorepo
- Use existing DTO patterns and decorators
- Maintain backward compatibility (existing endpoints unchanged)
- All new code must have tests
- Use existing `ApiResponseBuilder` pattern for responses
- Follow existing hook patterns in dashboard

---

## File Structure

### Backend (apps/api)
- **Modify:** `apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts` — Add `findAllForTree()` method, fix Decimal conversion in `sumPostedLinesByAccount()`
- **Modify:** `apps/api/src/modules/accounting/accounts/services/accounts.service.ts` — Add `getTree()` method
- **Modify:** `apps/api/src/modules/accounting/accounts/controllers/accounts.controller.ts` — Add `@Get('tree')` endpoint
- **Modify:** `apps/api/src/modules/accounting/accounts/dto/account.dto.ts` — Add `ChartOfAccountTreeDto`
- **Modify:** `apps/api/src/modules/accounting/accounts/services/account-balances.service.spec.ts` — Add integration test for roll-up

### API Contract (packages/api-contracts)
- **Modify:** `packages/api-contracts/src/resources/account.resource.ts` — Add `tree` route

### API Client (packages/api-client)
- **Modify:** `packages/api-client/src/clients/account.client.ts` — Add `tree()` method

### Frontend (apps/dashboard)
- **Create:** `apps/dashboard/modules/accounts/hooks/use-account-tree.ts` — New hook for lightweight tree data
- **Modify:** `apps/dashboard/modules/accounts/hooks/index.ts` — Export new hook
- **Modify:** `apps/dashboard/modules/accounts/components/accounts-page.tsx` — Use separate data sources
- **Modify:** `apps/dashboard/modules/accounts/components/account-balances-panel.tsx` — Display both own and rolled balances
- **Modify:** `apps/dashboard/modules/accounts/components/account-balances-table.tsx` — Add own balance column

---

### Task 1: Add Tree DTO

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/dto/account.dto.ts`

**Interfaces:**
- Consumes: None (standalone DTO)
- Produces: `ChartOfAccountTreeDto` class for OpenAPI documentation

- [ ] **Step 1: Read existing DTO file**

Run: `cat apps/api/src/modules/accounting/accounts/dto/account.dto.ts`

- [ ] **Step 2: Add ChartOfAccountTreeDto**

Add the following class to `apps/api/src/modules/accounting/accounts/dto/account.dto.ts`:

```typescript
export class ChartOfAccountTreeDto {
  @ApiProperty({ description: 'Account UUID' })
  id: string;

  @ApiProperty({ description: 'Account code' })
  code: string;

  @ApiProperty({ description: 'Locale-resolved display name' })
  name: string;

  @ApiProperty({ description: 'Raw localized name object' })
  nameI18n: object;

  @ApiProperty({ enum: AccountType, description: 'Account type' })
  type: AccountType;

  @ApiProperty({ nullable: true, description: 'Parent account UUID or null' })
  parentId: string | null;

  @ApiProperty({ description: 'Whether account is active' })
  isActive: boolean;
}
```

- [ ] **Step 3: Verify imports**

Ensure the file has these imports at the top:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@devloggers/db-prisma';
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/dto/account.dto.ts
git commit -m "feat(accounts): add ChartOfAccountTreeDto"
```

---

### Task 2: Add Repository Method for Tree

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts`

**Interfaces:**
- Consumes: `tenantId: string`
- Produces: `findAllForTree(tenantId)` returns array of account objects with minimal fields

- [ ] **Step 1: Read existing repository**

Run: `cat apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts`

- [ ] **Step 2: Add findAllForTree method**

Add the following method to `apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts` after the `findAllForBalances` method:

```typescript
/** Lightweight account list for tree navigation (no balance computation). */
async findAllForTree(tenantId: string) {
  return this.prisma.chartOfAccount.findMany({
    where: { tenantId },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      parentId: true,
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts
git commit -m "feat(accounts): add findAllForTree repository method"
```

---

### Task 3: Add Service Method for Tree

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/services/accounts.service.ts`

**Interfaces:**
- Consumes: `AccountsRepository.findAllForTree()`, `LocaleResolverService`
- Produces: `getTree(tenantId)` returns array of tree-ready account objects

- [ ] **Step 1: Read existing service**

Run: `cat apps/api/src/modules/accounting/accounts/services/accounts.service.ts`

- [ ] **Step 2: Add getTree method**

Add the following method to `apps/api/src/modules/accounting/accounts/services/accounts.service.ts`:

```typescript
async getTree(tenantId: string) {
  const accounts = await this.repo.findAllForTree(tenantId);
  return accounts.map((a) => {
    const name = a.name as unknown as LocalizedString;
    return {
      id: a.id,
      code: a.code,
      name: this.locale.resolve(name),
      nameI18n: name,
      type: a.type,
      parentId: a.parentId ?? null,
      isActive: a.isActive,
    };
  });
}
```

- [ ] **Step 3: Verify imports**

Ensure the file has this import at the top:

```typescript
import type { LocalizedString } from '@devloggers/api-contracts';
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/services/accounts.service.ts
git commit -m "feat(accounts): add getTree service method"
```

---

### Task 4: Add Tree Controller Endpoint

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/controllers/accounts.controller.ts`

**Interfaces:**
- Consumes: `AccountsService.getTree()`, `ChartOfAccountTreeDto`
- Produces: `GET /accounting/chart-of-accounts/tree` endpoint

- [ ] **Step 1: Read existing controller**

Run: `cat apps/api/src/modules/accounting/accounts/controllers/accounts.controller.ts`

- [ ] **Step 2: Add tree endpoint**

Add the following method to `apps/api/src/modules/accounting/accounts/controllers/accounts.controller.ts` **BEFORE** the `findById` method (to avoid route conflicts with `:id`):

```typescript
@Get('tree')
@ApiOperation({
  summary: 'Get account tree structure',
  description: 'Lightweight account list for tree navigation. No balance computation.',
})
@ApiOkResponseStandard(ChartOfAccountTreeDto, { isArray: true, description: 'Account tree' })
@ApiStandardErrors()
async tree(@CurrentUser() user: RequestUser) {
  const data = await this.accountsService.getTree(user.tenantId);
  return ApiResponseBuilder.success(data, 'Account tree');
}
```

- [ ] **Step 3: Add required imports**

Add these imports at the top of the file:

```typescript
import { Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/modules/identity/auth/decorators';
import { ApiResponseBuilder } from '@/common/api/api-response-builder';
import { ApiStandardErrors, ApiOkResponseStandard } from '@/common/decorators/api-swagger.decorators';
import { ChartOfAccountTreeDto } from '../dto';
```

- [ ] **Step 4: Verify DTO is exported**

Run: `cat apps/api/src/modules/accounting/accounts/dto/index.ts`

Ensure `ChartOfAccountTreeDto` is exported. If not, add it:

```typescript
export * from './account.dto';
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/controllers/accounts.controller.ts
git commit -m "feat(accounts): add GET /accounting/chart-of-accounts/tree endpoint"
```

---

### Task 5: Fix Decimal Conversion in Balances

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts`

**Interfaces:**
- Consumes: Prisma `groupBy` result with Decimal types
- Produces: Properly converted number values for debit/credit sums

- [ ] **Step 1: Read current sumPostedLinesByAccount method**

Run: `cat apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts | grep -A 15 "sumPostedLinesByAccount"`

- [ ] **Step 2: Fix Decimal conversion**

Update the `sumPostedLinesByAccount` method in `apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts` to explicitly handle Decimal conversion:

```typescript
/** Sum of POSTED debit/credit grouped by account, tenant-scoped. */
async sumPostedLinesByAccount(
  tenantId: string,
): Promise<Array<{ accountId: string; debit: number; credit: number }>> {
  const grouped = await this.prisma.journalLine.groupBy({
    by: ['accountId'],
    where: { tenantId, journalEntry: { status: JournalEntryStatus.POSTED } },
    _sum: { debit: true, credit: true },
  });
  return grouped.map((g) => ({
    accountId: g.accountId,
    debit: g._sum.debit ? Number(g._sum.debit) : 0,
    credit: g._sum.credit ? Number(g._sum.credit) : 0,
  }));
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts
git commit -m "fix(accounts): ensure explicit Decimal to number conversion in balance sums"
```

---

### Task 6: Add Integration Test for Roll-Up

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/services/account-balances.service.spec.ts`

**Interfaces:**
- Consumes: `AccountBalancesService.getBalances()`
- Produces: Test verifying parent accounts correctly roll up child balances

- [ ] **Step 1: Read existing test file**

Run: `cat apps/api/src/modules/accounting/accounts/services/account-balances.service.spec.ts`

- [ ] **Step 2: Add integration test for multi-level roll-up**

Add the following test to `apps/api/src/modules/accounting/accounts/services/account-balances.service.spec.ts`:

```typescript
it('rolls up balances through multiple hierarchy levels', async () => {
  const repo = makeRepo({
    findAllForBalances: jest.fn().mockResolvedValue([
      { id: 'assets', code: '1000', name: { ar: 'الأصول' }, type: 'ASSET', parentId: null, isActive: true },
      { id: 'current', code: '1100', name: { ar: 'أصول متداولة' }, type: 'ASSET', parentId: 'assets', isActive: true },
      { id: 'cash', code: '1110', name: { ar: 'نقد' }, type: 'ASSET', parentId: 'current', isActive: true },
      { id: 'bank', code: '1120', name: { ar: 'بنك' }, type: 'ASSET', parentId: 'current', isActive: true },
    ]),
    sumPostedLinesByAccount: jest.fn().mockResolvedValue([
      { accountId: 'cash', debit: 500, credit: 100 }, // ASSET → +400
      { accountId: 'bank', debit: 1000, credit: 200 }, // ASSET → +800
    ]),
  });
  const service = new AccountBalancesService(repo, localeStub);

  const result = await service.getBalances('t1');
  const byId = Object.fromEntries(result.map((r) => [r.id, r]));

  // Leaf accounts: own = rolled
  expect(byId['cash'].ownBalance).toBe(400);
  expect(byId['cash'].rolledBalance).toBe(400);
  expect(byId['bank'].ownBalance).toBe(800);
  expect(byId['bank'].rolledBalance).toBe(800);

  // Parent: own = 0, rolled = sum of children
  expect(byId['current'].ownBalance).toBe(0);
  expect(byId['current'].rolledBalance).toBe(1200); // 400 + 800

  // Grandparent: own = 0, rolled = sum of all descendants
  expect(byId['assets'].ownBalance).toBe(0);
  expect(byId['assets'].rolledBalance).toBe(1200); // rolled from current
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm --filter @devloggers/api test apps/api/src/modules/accounting/accounts/services/account-balances.service.spec.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/services/account-balances.service.spec.ts
git commit -m "test(accounts): add integration test for multi-level balance roll-up"
```

---

### Task 7: Add Tree Route to API Contract

**Files:**
- Modify: `packages/api-contracts/src/resources/account.resource.ts`

**Interfaces:**
- Consumes: None
- Produces: `tree` route definition in `accountResource`

- [ ] **Step 1: Read existing resource file**

Run: `cat packages/api-contracts/src/resources/account.resource.ts`

- [ ] **Step 2: Add tree route**

Update `packages/api-contracts/src/resources/account.resource.ts` to include the tree route:

```typescript
import { defineCrudResource } from './base/crud-resource'

export const accountResource = defineCrudResource({
  key: 'chart-of-accounts',
  routes: {
    list: '/accounting/chart-of-accounts',
    show: '/accounting/chart-of-accounts/{id}',
    create: '/accounting/chart-of-accounts',
    update: '/accounting/chart-of-accounts/{id}',
    delete: '/accounting/chart-of-accounts/{id}',
    tree: '/accounting/chart-of-accounts/tree',
    balances: '/accounting/account-balances',
    ledger: '/accounting/account-balances/{id}/ledger',
  },
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/api-contracts/src/resources/account.resource.ts
git commit -m "feat(api-contracts): add tree route to accountResource"
```

---

### Task 8: Add Tree Method to API Client

**Files:**
- Modify: `packages/api-client/src/clients/account.client.ts`

**Interfaces:**
- Consumes: `accountResource.routes.tree`
- Produces: `tree()` method on `AccountsClient`

- [ ] **Step 1: Read existing client file**

Run: `cat packages/api-client/src/clients/account.client.ts`

- [ ] **Step 2: Add tree method**

Add the following method to `packages/api-client/src/clients/account.client.ts`:

```typescript
tree = () => {
  const route = accountResource.routes.tree as ApiPathByMethod<'get'>;
  return this.apiClient.get(route);
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/api-client/src/clients/account.client.ts
git commit -m "feat(api-client): add tree method to AccountsClient"
```

---

### Task 9: Create useAccountTree Hook

**Files:**
- Create: `apps/dashboard/modules/accounts/hooks/use-account-tree.ts`
- Modify: `apps/dashboard/modules/accounts/hooks/index.ts`

**Interfaces:**
- Consumes: `api.chartOfAccounts.tree()`
- Produces: `useAccountTree()` hook returning `AccountListItem[]`

- [ ] **Step 1: Create use-account-tree.ts**

Create `apps/dashboard/modules/accounts/hooks/use-account-tree.ts`:

```typescript
import { useQuery } from "@tanstack/react-query"
import { accountResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import type { AccountListItem } from "../accounts.types"

export const ACCOUNT_TREE_KEY = ["account-tree"] as const

type RawTreeItem = {
  id: string
  code: string
  name: string
  nameI18n?: unknown
  type: AccountListItem["type"]
  parentId: string | null
  isActive: boolean
}

export function useAccountTree() {
  const api = useApi()
  return useQuery({
    queryKey: ACCOUNT_TREE_KEY,
    queryFn: () => api[accountResource.key].tree(),
    staleTime: 60_000,
    select: (res): AccountListItem[] => {
      const rows = (((res as { data?: unknown })?.data ?? []) as unknown) as RawTreeItem[]
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        nameI18n: (r.nameI18n as AccountListItem["nameI18n"]) ?? null,
        type: r.type,
        parentId: r.parentId ?? null,
        isActive: r.isActive,
      }))
    },
  })
}
```

- [ ] **Step 2: Export from index.ts**

Read `apps/dashboard/modules/accounts/hooks/index.ts` and add the export:

```typescript
export { useAccountTree, ACCOUNT_TREE_KEY } from "./use-account-tree"
```

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/accounts/hooks/use-account-tree.ts apps/dashboard/modules/accounts/hooks/index.ts
git commit -m "feat(dashboard): add useAccountTree hook for lightweight tree data"
```

---

### Task 10: Update AccountsPage to Use Separate Data Sources

**Files:**
- Modify: `apps/dashboard/modules/accounts/components/accounts-page.tsx`

**Interfaces:**
- Consumes: `useAccountTree()`, `useAccountBalances()`
- Produces: Page with tree using lightweight data and panel using balance data

- [ ] **Step 1: Read existing page**

Run: `cat apps/dashboard/modules/accounts/components/accounts-page.tsx`

- [ ] **Step 2: Update imports**

Update the imports in `apps/dashboard/modules/accounts/components/accounts-page.tsx` to include the new hook:

```typescript
import { useAccountsResource, useAccountBalances, useAccountTree, ACCOUNT_BALANCES_KEY } from "../hooks"
```

- [ ] **Step 3: Update AccountsPage component**

Replace the data fetching in `AccountsPage` component:

```typescript
export function AccountsPage() {
  const t = useTranslations("business.resources.accounts")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const treeRef = useRef<AccountsTreeHandle>(null)
  
  // Separate data sources
  const { data: treeItems = [], isLoading: treeLoading } = useAccountTree()
  const { data: balanceItems = [], isLoading: balancesLoading } = useAccountBalances()

  return (
    <AccountsResource>
      <AccountsResource.Page
        title={t("title")}
        toolbar={
          // ... toolbar code remains unchanged
        }
        actions={
          // ... actions code remains unchanged
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
          <AccountsTreePanel
            query={query}
            treeRef={treeRef}
            items={treeItems}
            isLoading={treeLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <AccountBalancesPanel
            items={balanceItems}
            selectedId={selectedId}
            onSelectAccount={setSelectedId}
          />
        </div>
      </AccountsResource.Page>
    </AccountsResource>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/accounts/components/accounts-page.tsx
git commit -m "feat(dashboard): use separate data sources for tree and balances panel"
```

---

### Task 11: Update AccountBalancesPanel to Show Both Balances

**Files:**
- Modify: `apps/dashboard/modules/accounts/components/account-balances-panel.tsx`

**Interfaces:**
- Consumes: `AccountBalanceItem` with `ownBalance` and `rolledBalance`
- Produces: Header displaying both own and rolled balances

- [ ] **Step 1: Read existing panel**

Run: `cat apps/dashboard/modules/accounts/components/account-balances-panel.tsx`

- [ ] **Step 2: Update header to show both balances**

Replace the balance display in the header section of `apps/dashboard/modules/accounts/components/account-balances-panel.tsx`:

```typescript
{selected && (
  <div className="flex items-center gap-4 font-mono text-sm tabular-nums">
    <div>
      <span className="text-xs text-muted-foreground">Own: </span>
      <span className={cn(
        selected.ownBalance < 0 ? "text-destructive" : "text-foreground",
      )}>
        {selected.ownBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
    <div>
      <span className="text-xs text-muted-foreground">Total: </span>
      <span className={cn(
        selected.rolledBalance < 0 ? "text-destructive" : "text-foreground",
      )}>
        {selected.rolledBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/accounts/components/account-balances-panel.tsx
git commit -m "feat(dashboard): display both own and rolled balances in panel header"
```

---

### Task 12: Update AccountBalancesTable to Show Own Balance Column

**Files:**
- Modify: `apps/dashboard/modules/accounts/components/account-balances-table.tsx`

**Interfaces:**
- Consumes: `AccountBalanceItem` with `ownBalance` and `rolledBalance`
- Produces: Table with separate columns for own and rolled balances

- [ ] **Step 1: Read existing table**

Run: `cat apps/dashboard/modules/accounts/components/account-balances-table.tsx`

- [ ] **Step 2: Add own balance column header**

Update the table header in `apps/dashboard/modules/accounts/components/account-balances-table.tsx`:

```typescript
<thead className="bg-muted/50 text-xs text-muted-foreground">
  <tr>
    <th className="px-3 py-2 text-start font-medium">{t("balances.columnCode")}</th>
    <th className="px-3 py-2 text-start font-medium">{t("balances.columnName")}</th>
    {showType && <th className="px-3 py-2 text-start font-medium">{t("balances.columnType")}</th>}
    <th className="px-3 py-2 text-end font-medium">{t("balances.columnOwnBalance")}</th>
    <th className="px-3 py-2 text-end font-medium">{t("balances.columnRolledBalance")}</th>
    <th className="w-8" />
  </tr>
</thead>
```

- [ ] **Step 3: Add own balance column data**

Update the table body to show both balance columns:

```typescript
<td className={cn(
  "px-3 py-2 text-end font-mono tabular-nums",
  row.ownBalance < 0 ? "text-destructive" : "text-muted-foreground",
)}>
  {formatBalance(row.ownBalance)}
</td>
<td className={cn(
  "px-3 py-2 text-end font-mono tabular-nums",
  row.rolledBalance < 0 ? "text-destructive" : "text-foreground",
)}>
  {formatBalance(row.rolledBalance)}
</td>
```

- [ ] **Step 4: Add translation keys**

Add these keys to your translation file (e.g., `apps/dashboard/messages/en.json`):

```json
{
  "business": {
    "resources": {
      "accounts": {
        "balances": {
          "columnOwnBalance": "Own Balance",
          "columnRolledBalance": "Total Balance"
        }
      }
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/modules/accounts/components/account-balances-table.tsx
git commit -m "feat(dashboard): add own balance column to balances table"
```

---

### Task 13: Run Full Test Suite

**Files:**
- None (verification task)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verification that all tests pass

- [ ] **Step 1: Run backend tests**

Run: `pnpm --filter @devloggers/api test`

Expected: All tests pass

- [ ] **Step 2: Run frontend type check**

Run: `pnpm --filter @devloggers/dashboard typecheck`

Expected: No type errors

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: No lint errors

- [ ] **Step 4: Manual verification**

Start the dev server and verify:
1. Tree loads quickly (no balance computation)
2. Parent accounts show correct rolled balances
3. Both own and rolled balances display in main panel
4. Tree navigation still works correctly

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add .
git commit -m "fix: address issues found during verification"
```

---

## Summary

This plan implements the chart of accounts enhancement in 13 tasks:

1. **Backend foundation (Tasks 1-6):** Tree endpoint + balance bug fix
2. **API layer (Tasks 7-8):** Contract and client updates
3. **Frontend (Tasks 9-12):** Separate data sources + dual balance display
4. **Verification (Task 13):** Full test suite + manual testing

Each task is self-contained with clear inputs/outputs, follows TDD where applicable, and includes commit steps for easy rollback.
