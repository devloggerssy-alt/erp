# Chart of Accounts Enhancement Design

**Date:** 2026-07-05  
**Status:** Approved  
**Author:** AI Assistant

## Overview

Enhance the chart of accounts feature to separate concerns between the tree view (fast navigation) and main panel (balance calculations). Currently, both views use a single heavy endpoint that computes journal line aggregations and roll-ups, causing slow tree loading. Additionally, parent account rolled balances are not correctly including child account balances.

## Goals

1. **Fast tree loading** — Tree view should load instantly without heavy journal line queries
2. **Accurate rolled balances** — Parent accounts should correctly sum their own balance + all descendant balances
3. **Clear separation** — Tree for navigation, main panel for calculations and detailed information

## Current State

### Backend
- Single endpoint `GET /accounting/account-balances` computes everything:
  - Fetches all accounts
  - Aggregates journal lines (debit/credit sums per account)
  - Computes own balance per account
  - Rolls up balances to parent accounts
  - Returns full dataset with balances

### Frontend
- `AccountsPage` uses `useAccountBalances()` for both tree and main panel
- Tree displays account structure (no balances shown — balance display is commented out)
- Main panel displays `rolledBalance` (should include sub-accounts)

### Bug
- Parent accounts show incorrect rolled balances — children's balances are not being included
- Unit tests for `rollUpBalances()` pass, so the logic is correct in isolation
- Issue is likely in data flow: Prisma Decimal handling, parentId linkage, or journal line aggregation

## Design

### Backend Changes

#### 1. New Lightweight Tree Endpoint

**Route:** `GET /accounting/chart-of-accounts/tree`

**Repository** — Add `findAllForTree(tenantId)`:
```typescript
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

**Service** — Add `getTree(tenantId)` on `AccountsService`:
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

**Controller** — Add `@Get('tree')` on `AccountsController`:
```typescript
@Get('tree')
@ApiOperation({
  summary: 'Get account tree structure',
  description: 'Lightweight account list for tree navigation. No balance computation.',
})
@ApiOkResponseStandard(ChartOfAccountTreeDto, { isArray: true })
@ApiStandardErrors()
async tree(@CurrentUser() user: RequestUser) {
  const data = await this.accountsService.getTree(user.tenantId);
  return ApiResponseBuilder.success(data, 'Account tree');
}
```

**DTO** — Add `ChartOfAccountTreeDto`:
```typescript
export class ChartOfAccountTreeDto {
  id: string;
  code: string;
  name: string;
  nameI18n: LocalizedString;
  type: AccountType;
  parentId: string | null;
  isActive: boolean;
}
```

**Benefits:**
- No journal line queries
- No balance computation
- Fast response (~10-50ms vs 200-500ms for balances)
- Tree loads instantly

#### 2. Fix Rolled Balance Bug

**Investigation steps:**
1. Add explicit Decimal→number conversion in `sumPostedLinesByAccount`:
   ```typescript
   return grouped.map((g) => ({
     accountId: g.accountId,
     debit: g._sum.debit ? Number(g._sum.debit) : 0,
     credit: g._sum.credit ? Number(g._sum.credit) : 0,
   }));
   ```

2. Add debug logging in `getBalances()`:
   ```typescript
   this.logger.debug('Own balances before roll-up:', own);
   const rolled = rollUpBalances(own);
   this.logger.debug('Rolled balances:', rolled);
   ```

3. Add integration test that verifies full flow:
   - Create parent account "Assets" (id: assets)
   - Create child account "Cash" (id: cash, parentId: assets)
   - Create journal entry with line posting to "cash" (debit: 300, credit: 100)
   - Call `getBalances()`
   - Assert: `assets.rolledBalance === 200` (rolled from cash)

4. Verify parentId is set correctly on all accounts in the database

**Display both balances in main view:**
- Show `ownBalance` (account's own journal lines)
- Show `rolledBalance` (own + all descendants)
- Format: "Own: 100.00 | Total: 250.00"

### API Contract & Client

#### 3. Add Tree Route

**File:** `packages/api-contracts/src/resources/account.resource.ts`
```typescript
export const accountResource = defineCrudResource({
  key: 'chart-of-accounts',
  routes: {
    list: '/accounting/chart-of-accounts',
    show: '/accounting/chart-of-accounts/{id}',
    create: '/accounting/chart-of-accounts',
    update: '/accounting/chart-of-accounts/{id}',
    delete: '/accounting/chart-of-accounts/{id}',
    tree: '/accounting/chart-of-accounts/tree',  // NEW
    balances: '/accounting/account-balances',
    ledger: '/accounting/account-balances/{id}/ledger',
  },
})
```

#### 4. Add Tree Method to Client

**File:** `packages/api-client/src/clients/account.client.ts`
```typescript
tree = () => {
  const route = accountResource.routes.tree as ApiPathByMethod<'get'>;
  return this.apiClient.get(route);
}
```

### Frontend Changes

#### 5. New Hook: useAccountTree

**File:** `apps/dashboard/modules/accounts/hooks/use-account-tree.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { accountResource } from '@devloggers/api-contracts';
import { useApi } from '@/shared/useApi';
import type { AccountListItem } from '../accounts.types';

export const ACCOUNT_TREE_KEY = ['account-tree'] as const;

type RawTreeItem = {
  id: string;
  code: string;
  name: string;
  nameI18n?: unknown;
  type: AccountListItem['type'];
  parentId: string | null;
  isActive: boolean;
};

export function useAccountTree() {
  const api = useApi();
  return useQuery({
    queryKey: ACCOUNT_TREE_KEY,
    queryFn: () => api[accountResource.key].tree(),
    staleTime: 60_000, // Tree is stable, cache for 1 minute
    select: (res): AccountListItem[] => {
      const rows = (((res as { data?: unknown })?.data ?? []) as unknown) as RawTreeItem[];
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        nameI18n: (r.nameI18n as AccountListItem['nameI18n']) ?? null,
        type: r.type,
        parentId: r.parentId ?? null,
        isActive: r.isActive,
      }));
    },
  });
}
```

#### 6. Keep Existing useAccountBalances

No changes needed — continues to provide full balance data for main panel.

#### 7. Update AccountsPage

**File:** `apps/dashboard/modules/accounts/components/accounts-page.tsx`

**Changes:**
```typescript
import { useAccountTree, useAccountBalances } from '../hooks';

export function AccountsPage() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const treeRef = useRef<AccountsTreeHandle>(null);
  
  // Separate data sources
  const { data: treeItems = [], isLoading: treeLoading } = useAccountTree();
  const { data: balanceItems = [], isLoading: balancesLoading } = useAccountBalances();

  return (
    <AccountsResource>
      <AccountsResource.Page ...>
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
          <AccountsTreePanel
            query={query}
            treeRef={treeRef}
            items={treeItems}  // Lightweight tree data
            isLoading={treeLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <AccountBalancesPanel
            items={balanceItems}  // Full balance data
            selectedId={selectedId}
            onSelectAccount={setSelectedId}
          />
        </div>
      </AccountsResource.Page>
    </AccountsResource>
  );
}
```

#### 8. Update AccountBalancesPanel

**File:** `apps/dashboard/modules/accounts/components/account-balances-panel.tsx`

**Changes:**
- Display both `ownBalance` and `rolledBalance` in header
- Update table to show both columns

**Header:**
```typescript
{selected && (
  <div className="flex items-center gap-4 font-mono text-sm tabular-nums">
    <div>
      <span className="text-xs text-muted-foreground">Own: </span>
      <span className={cn(selected.ownBalance < 0 ? 'text-destructive' : 'text-foreground')}>
        {selected.ownBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
    <div>
      <span className="text-xs text-muted-foreground">Total: </span>
      <span className={cn(selected.rolledBalance < 0 ? 'text-destructive' : 'text-foreground')}>
        {selected.rolledBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  </div>
)}
```

**Table columns:**
```
Code | Name | Own Balance | Rolled Balance | (chevron)
```

## Benefits

1. **Performance**
   - Tree loads in ~10-50ms (no journal queries)
   - Main panel loads in ~200-500ms (heavy computation)
   - Better perceived performance — tree is interactive immediately

2. **Correctness**
   - Rolled balances correctly include all descendants
   - Both own and rolled balances visible for transparency

3. **Maintainability**
   - Clear separation of concerns
   - Tree endpoint is simple and fast
   - Balances endpoint is feature-rich but isolated

4. **Scalability**
   - Tree endpoint can be cached aggressively
   - Balances endpoint can be optimized independently
   - Easy to add more features to either view

## Migration Path

1. Deploy new tree endpoint (backward compatible)
2. Update frontend to use separate data sources
3. Fix rolled balance bug
4. Remove commented-out balance display from tree (already done)

No database migrations required.

## Testing

1. **Unit tests**
   - `rollUpBalances()` already has tests (pass)
   - Add test for Decimal conversion edge cases

2. **Integration tests**
   - Test full flow: create accounts → create journal entries → verify balances
   - Test parent-child roll-up with multiple levels

3. **Manual testing**
   - Verify tree loads quickly
   - Verify parent accounts show correct rolled balances
   - Verify both own and rolled balances display correctly

## Future Enhancements

1. **Caching** — Add Redis cache for tree endpoint (accounts change infrequently)
2. **Pagination** — If account count grows large, add pagination to balances endpoint
3. **Real-time updates** — WebSocket for balance updates when journal entries are posted
4. **Export** — Add CSV/Excel export for balances table
