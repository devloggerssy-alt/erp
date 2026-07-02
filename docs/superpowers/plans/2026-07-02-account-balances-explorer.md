# Chart of Accounts — Balances Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the chart-of-accounts page as a master-detail balances explorer — a tree navigator plus a main panel showing ledger-computed, rolled-up balances with drill-down into a leaf account's journal lines.

**Architecture:** A new read-model on the backend computes balances on-read from `JournalLine` (source of truth), exposed on a **separate controller at `accounting/account-balances`** (distinct base path avoids any `:id` route collision with the CRUD controller). One endpoint returns all accounts + `ownBalance`/`rolledBalance`; a second returns a paginated per-account ledger. The dashboard loads all balances once and does parent→child drilling client-side.

**Tech Stack:** NestJS + Prisma (`groupBy` aggregate), `@devloggers/api-contracts` (OpenAPI-generated types), `@devloggers/api-client` (`CrudClient` + custom routes), Next.js App Router + TanStack Query + next-intl.

## Global Constraints

- **Balance sign convention:** debit-normal = `ASSET`/`EXPENSE` (`debit − credit`); credit-normal = `LIABILITY`/`EQUITY`/`REVENUE` (`credit − debit`). Reuse `getAccountBalanceDelta(type, debit, credit)` from `apps/api/src/modules/accounting/accounts/utils/account-balance.utils.ts`.
- **POSTED only:** balances and ledger include only journal lines whose `journalEntry.status = POSTED`.
- **Tenant scoping:** every query filters by `tenantId` (from `@CurrentUser() user: RequestUser`).
- **Swagger decorators mandatory:** every DTO field carries a complete `@ApiProperty`/`@ApiPropertyOptional` per `.ai/rules/api.md` (nullable → `{ type, nullable: true }`; enum → `{ enum, enumName }`). Never use `as any`/`@ts-ignore` to paper over generated types.
- **Regenerate after backend DTO/route changes:** run `pnpm generate` (root). Never hand-edit `packages/api-contracts/types/index.ts` or `apps/api/openapi.yaml`.
- **i18n:** all three locales (`en`, `ar`, `tr`) under `apps/dashboard/messages/*.json`. RTL-safe styling (logical `start`/`end`, never hardcoded `left`/`right`).
- **Money formatting (frontend):** `n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })`; negative → `text-destructive` (matches `account-tree-node.tsx`).
- **Test commands:** backend `pnpm --filter @devloggers/api test`; frontend `pnpm --filter @devloggers/dashboard test:unit`.
- **Branch:** `feat/account-balances-explorer` (already created).

---

## File Structure

**Backend** (`apps/api/src/modules/accounting/accounts/`)
- `utils/roll-up-balances.ts` (new) — pure post-order rollup + cycle guard.
- `utils/roll-up-balances.spec.ts` (new) — unit tests.
- `dto/account-balance.dto.ts` (new) — `AccountBalanceDto`, `AccountLedgerLineDto`.
- `dto/index.ts` (modify) — re-export the new DTOs.
- `repositories/accounts.repository.ts` (modify) — add balances/ledger data methods.
- `services/account-balances.service.ts` (new) — compose repo + rollup + presenter mapping.
- `services/account-balances.service.spec.ts` (new) — unit tests (mocked repo).
- `controllers/account-balances.controller.ts` (new) — the read-model controller.
- `accounts.module.ts` (modify) — register controller + service.

**Contracts / client**
- `packages/api-contracts/src/resources/account.resource.ts` (modify) — add `balances` + `ledger` routes.
- `packages/api-client/src/clients/account.client.ts` (modify) — add `balances()` + `ledger()`.

**Frontend** (`apps/dashboard/modules/accounts/`)
- `accounts.types.ts` (modify) — add `AccountBalanceItem`, `AccountLedgerLine`, `BreadcrumbCrumb`.
- `lib/account-balances.ts` (new) — pure selectors (children index, child rows, breadcrumb path).
- `lib/account-balances.test.ts` (new) — vitest unit tests.
- `hooks/use-account-balances.ts` (new) — TanStack query + DTO→item adapter.
- `hooks/use-account-ledger.ts` (new) — paginated ledger query.
- `hooks/index.ts` (modify) — re-export new hooks.
- `components/accounts-tree.tsx` (modify) — allow selection highlight + `onSelect` in `manage` mode.
- `components/account-tree-node.tsx` (modify) — select on row click in manage mode.
- `components/account-balances-table.tsx` (new) — balances rows (code/name/type/balance/chevron).
- `components/account-breadcrumb.tsx` (new) — clickable path.
- `components/account-ledger-view.tsx` (new) — per-account journal-line detail + pagination + back.
- `components/account-balances-panel.tsx` (new) — main panel: breadcrumb + header + table ↔ ledger.
- `components/accounts-page.tsx` (modify) — two-column master-detail; balances query drives tree + panel.
- `components/accounts-form.tsx` (modify) — invalidate `["account-balances"]` on mutation success.
- `messages/en.json`, `messages/ar.json`, `messages/tr.json` (modify) — new keys.

---

## Task 1: Backend — balance rollup pure util

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/utils/roll-up-balances.ts`
- Test: `apps/api/src/modules/accounting/accounts/utils/roll-up-balances.spec.ts`

**Interfaces:**
- Produces: `rollUpBalances(nodes: BalanceNode[]): Map<string, number>` where `BalanceNode = { id: string; parentId: string | null; ownBalance: number }`. Returns a map `id → rolledBalance` (own + Σ descendants). Cycle-safe; orphan `parentId` (points nowhere) is treated as a root.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/accounting/accounts/utils/roll-up-balances.spec.ts
import { rollUpBalances, type BalanceNode } from './roll-up-balances';

describe('rollUpBalances', () => {
  it('rolls descendants up into ancestors', () => {
    const nodes: BalanceNode[] = [
      { id: 'root', parentId: null, ownBalance: 0 },
      { id: 'a', parentId: 'root', ownBalance: 100 },
      { id: 'b', parentId: 'root', ownBalance: 50 },
      { id: 'a1', parentId: 'a', ownBalance: 25 },
    ];
    const rolled = rollUpBalances(nodes);
    expect(rolled.get('a1')).toBe(25);
    expect(rolled.get('a')).toBe(125);
    expect(rolled.get('b')).toBe(50);
    expect(rolled.get('root')).toBe(175);
  });

  it('treats an orphan parentId as a root (no crash)', () => {
    const rolled = rollUpBalances([{ id: 'x', parentId: 'ghost', ownBalance: 10 }]);
    expect(rolled.get('x')).toBe(10);
  });

  it('is cycle-safe', () => {
    const nodes: BalanceNode[] = [
      { id: 'p', parentId: 'q', ownBalance: 1 },
      { id: 'q', parentId: 'p', ownBalance: 2 },
    ];
    const rolled = rollUpBalances(nodes);
    expect(rolled.get('p')).toBeGreaterThanOrEqual(1);
    expect(rolled.get('q')).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- roll-up-balances`
Expected: FAIL — cannot find module `./roll-up-balances`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/api/src/modules/accounting/accounts/utils/roll-up-balances.ts

/** Minimal shape needed to roll balances up a parent hierarchy. */
export interface BalanceNode {
  id: string;
  parentId: string | null;
  ownBalance: number;
}

/**
 * Returns a map of accountId → rolled balance (own + sum of all descendants).
 * A parentId that points to a non-existent node is treated as a root.
 * Cycles are broken defensively so traversal always terminates.
 */
export function rollUpBalances(nodes: BalanceNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    const parentKey = n.parentId && byId.has(n.parentId) ? n.parentId : null;
    if (parentKey) {
      const list = childrenOf.get(parentKey) ?? [];
      list.push(n.id);
      childrenOf.set(parentKey, list);
    }
  }

  const rolled = new Map<string, number>();
  const computed = new Set<string>();

  const compute = (id: string, path: Set<string>): number => {
    if (rolled.has(id)) return rolled.get(id)!;
    if (path.has(id)) return byId.get(id)?.ownBalance ?? 0; // cycle: own only
    path.add(id);
    const own = byId.get(id)?.ownBalance ?? 0;
    const childSum = (childrenOf.get(id) ?? []).reduce(
      (sum, childId) => sum + compute(childId, path),
      0,
    );
    path.delete(id);
    const total = own + childSum;
    rolled.set(id, total);
    computed.add(id);
    return total;
  };

  for (const n of nodes) compute(n.id, new Set());
  return rolled;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- roll-up-balances`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/utils/roll-up-balances.ts apps/api/src/modules/accounting/accounts/utils/roll-up-balances.spec.ts
git commit -m "feat(accounting): add cycle-safe balance rollup util"
```

---

## Task 2: Backend — balance & ledger DTOs

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/dto/account-balance.dto.ts`
- Modify: `apps/api/src/modules/accounting/accounts/dto/index.ts`

**Interfaces:**
- Produces: `AccountBalanceDto { id, code, name, nameI18n, type, parentId, isActive, ownBalance, rolledBalance }` and `AccountLedgerLineDto { id, date, entryNumber, description, referenceType, referenceId, debit, credit }`. Consumed by Task 4 (service return type) and Task 5 (controller Swagger models).

- [ ] **Step 1: Create the DTO file**

```typescript
// apps/api/src/modules/accounting/accounts/dto/account-balance.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedStringDto } from '@devloggers/backend-core';
import { AccountTypeEnum } from './account.dto';

// ── Account balance row ─────────────────────────────────────────────────────

export class AccountBalanceDto {
  @ApiProperty({ type: 'string', example: '00000000-0000-4000-a601-000000000001' })
  id: string = '';

  @ApiProperty({ type: 'string', example: '1110' })
  code: string = '';

  @ApiProperty({ type: 'string', example: 'نقد وما يعادله' })
  name: string = '';

  @ApiProperty({ type: LocalizedStringDto })
  nameI18n: LocalizedStringDto = new LocalizedStringDto();

  @ApiProperty({ enum: AccountTypeEnum, enumName: 'AccountTypeEnum', example: 'ASSET' })
  type: AccountTypeEnum = AccountTypeEnum.ASSET;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a601-000000000000' })
  parentId: string | null = null;

  @ApiProperty({ type: 'boolean', example: true })
  isActive: boolean = true;

  @ApiProperty({ type: 'number', example: 1500, description: 'Signed balance of lines posted directly to this account' })
  ownBalance: number = 0;

  @ApiProperty({ type: 'number', example: 4200, description: 'ownBalance plus the rolled-up balance of all descendants' })
  rolledBalance: number = 0;
}

// ── Account ledger line ─────────────────────────────────────────────────────

export class AccountLedgerLineDto {
  @ApiProperty({ type: 'string', example: '00000000-0000-4000-b101-000000000001' })
  id: string = '';

  @ApiProperty({ type: 'string', format: 'date-time', example: '2026-01-15T00:00:00.000Z' })
  date: string = '';

  @ApiProperty({ type: 'string', example: 'JE-2026-000042' })
  entryNumber: string = '';

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'Sales invoice INV-000042' })
  description: string | null = null;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: 'invoice' })
  referenceType: string | null = null;

  @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-c101-000000000001' })
  referenceId: string | null = null;

  @ApiProperty({ type: 'number', example: 1500 })
  debit: number = 0;

  @ApiProperty({ type: 'number', example: 0 })
  credit: number = 0;
}
```

- [ ] **Step 2: Re-export from the DTO barrel**

Modify `apps/api/src/modules/accounting/accounts/dto/index.ts` — add this line (keep existing exports):

```typescript
export * from './account-balance.dto';
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm --filter @devloggers/api exec tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `account-balance.dto`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/dto/
git commit -m "feat(accounting): add account balance & ledger DTOs"
```

---

## Task 3: Backend — repository data methods

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts`

**Interfaces:**
- Consumes: `PrismaService` (already injected as `this.prisma`).
- Produces on `AccountsRepository`:
  - `findAllForBalances(tenantId: string): Promise<Array<{ id: string; code: string; name: unknown; type: AccountType; parentId: string | null; isActive: boolean }>>`
  - `sumPostedLinesByAccount(tenantId: string): Promise<Array<{ accountId: string; debit: number; credit: number }>>`
  - `findLedgerLines(tenantId, accountId, skip, take): Promise<Array<{ id; debit; credit; description; journalEntry: { number; date; referenceType; referenceId } }>>`
  - `countLedgerLines(tenantId, accountId): Promise<number>`

- [ ] **Step 1: Add the methods**

Add these imports at the top (merge with existing): `import { JournalEntryStatus, type AccountType } from '@devloggers/db-prisma';`

Then add inside the `AccountsRepository` class (after `isCodeTaken`):

```typescript
  /** All accounts (minimal columns) for the balances read-model. */
  async findAllForBalances(tenantId: string) {
    return this.prisma.chartOfAccount.findMany({
      where: { tenantId },
      select: { id: true, code: true, name: true, type: true, parentId: true, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  /** Sum of POSTED debit/credit grouped by account, tenant-scoped. */
  async sumPostedLinesByAccount(tenantId: string): Promise<Array<{ accountId: string; debit: number; credit: number }>> {
    const grouped = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: { tenantId, journalEntry: { status: JournalEntryStatus.POSTED } },
      _sum: { debit: true, credit: true },
    });
    return grouped.map((g) => ({
      accountId: g.accountId,
      debit: Number(g._sum.debit ?? 0),
      credit: Number(g._sum.credit ?? 0),
    }));
  }

  /** One page of POSTED journal lines hitting a single account, newest entry first. */
  async findLedgerLines(tenantId: string, accountId: string, skip: number, take: number) {
    return this.prisma.journalLine.findMany({
      where: { tenantId, accountId, journalEntry: { status: JournalEntryStatus.POSTED } },
      select: {
        id: true,
        debit: true,
        credit: true,
        description: true,
        journalEntry: { select: { number: true, date: true, referenceType: true, referenceId: true } },
      },
      orderBy: [{ journalEntry: { date: 'desc' } }, { sortOrder: 'asc' }],
      skip,
      take,
    });
  }

  async countLedgerLines(tenantId: string, accountId: string): Promise<number> {
    return this.prisma.journalLine.count({
      where: { tenantId, accountId, journalEntry: { status: JournalEntryStatus.POSTED } },
    });
  }
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @devloggers/api exec tsc --noEmit -p tsconfig.json`
Expected: no errors. (If `groupBy` relation filter or `orderBy` on `journalEntry` type-errors, confirm the Prisma client is generated: `pnpm --filter @devloggers/db-prisma db:generate`.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts
git commit -m "feat(accounting): add balance & ledger repository queries"
```

---

## Task 4: Backend — AccountBalancesService

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/services/account-balances.service.ts`
- Test: `apps/api/src/modules/accounting/accounts/services/account-balances.service.spec.ts`

**Interfaces:**
- Consumes: `AccountsRepository` (Task 3), `LocaleResolverService` (from `@devloggers/backend-core`), `getAccountBalanceDelta` (util), `rollUpBalances` (Task 1), `AccountBalanceDto`/`AccountLedgerLineDto` (Task 2).
- Produces:
  - `getBalances(tenantId: string): Promise<AccountBalanceDto[]>`
  - `getLedger(tenantId: string, accountId: string, page: number, limit: number): Promise<{ data: AccountLedgerLineDto[]; total: number; page: number; limit: number }>`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/accounting/accounts/services/account-balances.service.spec.ts
import { AccountBalancesService } from './account-balances.service';

const localeStub = { resolve: (v: any) => v?.ar ?? '' } as any;

function makeRepo(overrides: Partial<any> = {}) {
  return {
    findAllForBalances: jest.fn(),
    sumPostedLinesByAccount: jest.fn(),
    findLedgerLines: jest.fn(),
    countLedgerLines: jest.fn(),
    ...overrides,
  } as any;
}

describe('AccountBalancesService.getBalances', () => {
  it('computes signed own balances and rolls them up', async () => {
    const repo = makeRepo({
      findAllForBalances: jest.fn().mockResolvedValue([
        { id: 'assets', code: '1000', name: { ar: 'الأصول' }, type: 'ASSET', parentId: null, isActive: true },
        { id: 'cash', code: '1110', name: { ar: 'نقد' }, type: 'ASSET', parentId: 'assets', isActive: true },
        { id: 'rev', code: '4000', name: { ar: 'إيرادات' }, type: 'REVENUE', parentId: null, isActive: true },
      ]),
      sumPostedLinesByAccount: jest.fn().mockResolvedValue([
        { accountId: 'cash', debit: 300, credit: 100 }, // ASSET → +200
        { accountId: 'rev', debit: 0, credit: 500 },     // REVENUE → +500
      ]),
    });
    const service = new AccountBalancesService(repo, localeStub);

    const result = await service.getBalances('t1');
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));

    expect(byId['cash'].ownBalance).toBe(200);
    expect(byId['cash'].rolledBalance).toBe(200);
    expect(byId['assets'].ownBalance).toBe(0);
    expect(byId['assets'].rolledBalance).toBe(200); // rolled from cash
    expect(byId['rev'].ownBalance).toBe(500);
    expect(byId['assets'].name).toBe('الأصول'); // locale-resolved
  });
});

describe('AccountBalancesService.getLedger', () => {
  it('maps lines and returns pagination meta', async () => {
    const repo = makeRepo({
      countLedgerLines: jest.fn().mockResolvedValue(1),
      findLedgerLines: jest.fn().mockResolvedValue([
        {
          id: 'l1', debit: 150, credit: 0, description: 'Inv',
          journalEntry: { number: 'JE-1', date: new Date('2026-01-15T00:00:00.000Z'), referenceType: 'invoice', referenceId: 'inv1' },
        },
      ]),
    });
    const service = new AccountBalancesService(repo, localeStub);

    const result = await service.getLedger('t1', 'cash', 1, 50);

    expect(result.total).toBe(1);
    expect(result.data[0]).toEqual({
      id: 'l1',
      date: '2026-01-15T00:00:00.000Z',
      entryNumber: 'JE-1',
      description: 'Inv',
      referenceType: 'invoice',
      referenceId: 'inv1',
      debit: 150,
      credit: 0,
    });
    expect(repo.findLedgerLines).toHaveBeenCalledWith('t1', 'cash', 0, 50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- account-balances.service`
Expected: FAIL — cannot find module `./account-balances.service`.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/modules/accounting/accounts/services/account-balances.service.ts
import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import type { LocalizedString } from '@devloggers/api-contracts';
import type { AccountType } from '@devloggers/db-prisma';
import { AccountsRepository } from '../repositories/accounts.repository';
import { getAccountBalanceDelta } from '../utils/account-balance.utils';
import { rollUpBalances } from '../utils/roll-up-balances';
import { AccountBalanceDto, AccountLedgerLineDto } from '../dto';

@Injectable()
export class AccountBalancesService {
  constructor(
    private readonly repo: AccountsRepository,
    private readonly locale: LocaleResolverService,
  ) {}

  async getBalances(tenantId: string): Promise<AccountBalanceDto[]> {
    const [accounts, sums] = await Promise.all([
      this.repo.findAllForBalances(tenantId),
      this.repo.sumPostedLinesByAccount(tenantId),
    ]);

    const sumByAccount = new Map(sums.map((s) => [s.accountId, s]));

    const own = accounts.map((a) => {
      const s = sumByAccount.get(a.id);
      const ownBalance = s ? getAccountBalanceDelta(a.type as AccountType, s.debit, s.credit) : 0;
      return { id: a.id, parentId: a.parentId ?? null, ownBalance };
    });

    const rolled = rollUpBalances(own);

    return accounts.map((a) => {
      const name = a.name as LocalizedString;
      const ownBalance = own.find((o) => o.id === a.id)?.ownBalance ?? 0;
      return {
        id: a.id,
        code: a.code,
        name: this.locale.resolve(name),
        nameI18n: name,
        type: a.type as AccountBalanceDto['type'],
        parentId: a.parentId ?? null,
        isActive: a.isActive,
        ownBalance,
        rolledBalance: rolled.get(a.id) ?? ownBalance,
      };
    });
  }

  async getLedger(
    tenantId: string,
    accountId: string,
    page: number,
    limit: number,
  ): Promise<{ data: AccountLedgerLineDto[]; total: number; page: number; limit: number }> {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 50;
    const skip = (safePage - 1) * safeLimit;

    const [total, lines] = await Promise.all([
      this.repo.countLedgerLines(tenantId, accountId),
      this.repo.findLedgerLines(tenantId, accountId, skip, safeLimit),
    ]);

    const data: AccountLedgerLineDto[] = lines.map((l) => ({
      id: l.id,
      date: l.journalEntry.date.toISOString(),
      entryNumber: l.journalEntry.number,
      description: l.description ?? null,
      referenceType: l.journalEntry.referenceType ?? null,
      referenceId: l.journalEntry.referenceId ?? null,
      debit: Number(l.debit),
      credit: Number(l.credit),
    }));

    return { data, total, page: safePage, limit: safeLimit };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- account-balances.service`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/services/account-balances.service.ts apps/api/src/modules/accounting/accounts/services/account-balances.service.spec.ts
git commit -m "feat(accounting): add account balances read-model service"
```

---

## Task 5: Backend — controller, module wiring, regenerate types

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/controllers/account-balances.controller.ts`
- Modify: `apps/api/src/modules/accounting/accounts/accounts.module.ts`

**Interfaces:**
- Consumes: `AccountBalancesService` (Task 4), `AccountBalanceDto`/`AccountLedgerLineDto` (Task 2), `ApiResponseBuilder`, `JwtAuthGuard`, `CurrentUser`/`RequestUser`, `ApiOkResponseStandard`/`ApiOkResponsePaginated`/`ApiStandardErrors`.
- Produces API routes: `GET /accounting/account-balances`, `GET /accounting/account-balances/:id/ledger` → OpenAPI paths consumed by Task 6.

- [ ] **Step 1: Create the controller**

```typescript
// apps/api/src/modules/accounting/accounts/controllers/account-balances.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AccountBalancesService } from '../services/account-balances.service';
import { AccountBalanceDto, AccountLedgerLineDto } from '../dto';
import { JwtAuthGuard } from '@/modules/identity/auth/guards';
import { CurrentUser, type RequestUser } from '@/modules/identity/auth/decorators';
import { ApiResponseBuilder } from '@/common/api/api-response-builder';
import {
  ApiStandardErrors,
  ApiOkResponseStandard,
  ApiOkResponsePaginated,
} from '@/common/decorators/api-swagger.decorators';

@ApiTags('Accounting / Account Balances')
@Controller('accounting/account-balances')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AccountBalancesController {
  constructor(private readonly service: AccountBalancesService) {}

  @Get()
  @ApiOperation({
    summary: 'List account balances',
    description: 'All chart-of-accounts entries with ledger-computed own and rolled-up balances (POSTED entries only).',
  })
  @ApiOkResponseStandard(AccountBalanceDto, { isArray: true, description: 'Account balances' })
  @ApiStandardErrors()
  async list(@CurrentUser() user: RequestUser) {
    const data = await this.service.getBalances(user.tenantId);
    return ApiResponseBuilder.success(data, 'Account balances');
  }

  @Get(':id/ledger')
  @ApiOperation({
    summary: 'Get an account ledger',
    description: 'Paginated POSTED journal lines posted to a single account, newest entry first.',
  })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponsePaginated(AccountLedgerLineDto, { description: 'Account ledger lines' })
  @ApiStandardErrors()
  async ledger(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.service.getLedger(
      user.tenantId,
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
    return ApiResponseBuilder.success(result.data, 'Account ledger lines', {
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  }
}
```

> If `@/common/api/api-response-builder` or `@/common/decorators/api-swagger.decorators` do not resolve under the `@/` alias from this depth, use the relative paths used by `invoices.controller.ts`: `../../../common/api/api-response-builder` and `../../../common/decorators/api-swagger.decorators`, and `../../identity/auth/decorators` / `../../identity/auth/guards`.

- [ ] **Step 2: Register in the accounts module**

Modify `apps/api/src/modules/accounting/accounts/accounts.module.ts` — add imports and register the controller + service. Add:

```typescript
import { AccountBalancesController } from './controllers/account-balances.controller';
import { AccountBalancesService } from './services/account-balances.service';
```

Then add `AccountBalancesController` to the `controllers` array and `AccountBalancesService` to the `providers` array (keep existing entries).

- [ ] **Step 3: Regenerate the OpenAPI spec + contract types**

Run: `pnpm generate`
Expected: completes without error; `apps/api/openapi.yaml` now contains `/accounting/account-balances` and `/accounting/account-balances/{id}/ledger`.

- [ ] **Step 4: Verify the spec has the new paths**

Run: `grep -n "account-balances" apps/api/openapi.yaml`
Expected: matches for both the collection and `{id}/ledger` paths.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/controllers/account-balances.controller.ts apps/api/src/modules/accounting/accounts/accounts.module.ts apps/api/openapi.yaml packages/api-contracts/types/index.ts
git commit -m "feat(accounting): expose account balances & ledger endpoints"
```

---

## Task 6: Contracts + client — routes and methods

**Files:**
- Modify: `packages/api-contracts/src/resources/account.resource.ts`
- Modify: `packages/api-client/src/clients/account.client.ts`

**Interfaces:**
- Consumes: generated `paths` including `/accounting/account-balances` (Task 5).
- Produces: `accountResource.routes.balances`, `accountResource.routes.ledger`; `AccountsClient.balances()`, `AccountsClient.ledger(id, query)`.

- [ ] **Step 1: Add routes to the resource**

Modify `packages/api-contracts/src/resources/account.resource.ts` — add two routes inside `routes` (keep the existing five):

```typescript
export const accountResource = defineCrudResource({
  key: 'chart-of-accounts',
  routes: {
    list: '/accounting/chart-of-accounts',
    show: '/accounting/chart-of-accounts/{id}',
    create: '/accounting/chart-of-accounts',
    update: '/accounting/chart-of-accounts/{id}',
    delete: '/accounting/chart-of-accounts/{id}',
    balances: '/accounting/account-balances',
    ledger: '/accounting/account-balances/{id}/ledger',
  },
})
```

- [ ] **Step 2: Rebuild api-contracts**

Run: `pnpm --filter @devloggers/api-contracts build`
Expected: builds without error (route string literals must match generated `paths` keys).

- [ ] **Step 3: Add client methods**

Modify `packages/api-client/src/clients/account.client.ts`:

```typescript
import { accountResource } from "@devloggers/api-contracts"
import type { ApiPathByMethod, ApiQueryParams } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class AccountsClient extends CrudClient<typeof accountResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, accountResource)
  }

  balances = () => {
    const route = accountResource.routes.balances as ApiPathByMethod<"get">
    return this.apiClient.get(route)
  }

  ledger = (id: string, query?: ApiQueryParams<typeof accountResource.routes.ledger, "get">) => {
    const route = accountResource.routes.ledger as ApiPathByMethod<"get">
    return this.apiClient.get(route, { params: { id }, query } as never)
  }
}
```

> If `ApiQueryParams<...>` resolves to `never` (no query params in the generated spec), simplify the `ledger` signature to `ledger = (id: string, query?: { page?: number; limit?: number }) =>` and cast the options with `as never` (the query serializer forwards arbitrary keys). Keep `params: { id }`.

- [ ] **Step 4: Build api-client**

Run: `pnpm --filter @devloggers/api-client build`
Expected: builds without error.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/resources/account.resource.ts packages/api-client/src/clients/account.client.ts
git commit -m "feat(api-client): add account balances & ledger client methods"
```

---

## Task 7: Frontend — types + pure selectors

**Files:**
- Modify: `apps/dashboard/modules/accounts/accounts.types.ts`
- Create: `apps/dashboard/modules/accounts/lib/account-balances.ts`
- Test: `apps/dashboard/modules/accounts/lib/account-balances.test.ts`

**Interfaces:**
- Produces types: `AccountBalanceItem = AccountListItem & { ownBalance: number; rolledBalance: number }`, `AccountLedgerLine`, `BreadcrumbCrumb = { id: string; code: string; label: string }`.
- Produces functions:
  - `buildChildrenIndex(items: AccountBalanceItem[]): Map<string, AccountBalanceItem[]>` — key `""` holds roots; children sorted by `code`; orphan parentId → root.
  - `getChildRows(index, selectedId: string | null): AccountBalanceItem[]`
  - `hasChildren(index, id: string): boolean`
  - `getBreadcrumbPath(byId: Map<string, AccountBalanceItem>, selectedId: string | null): BreadcrumbCrumb[]` — root→selected, cycle-safe, `[]` when null.

- [ ] **Step 1: Add the types**

Append to `apps/dashboard/modules/accounts/accounts.types.ts`:

```typescript
export type AccountBalanceItem = AccountListItem & {
    ownBalance: number
    rolledBalance: number
}

export type AccountLedgerLine = {
    id: string
    date: string
    entryNumber: string
    description: string | null
    referenceType: string | null
    referenceId: string | null
    debit: number
    credit: number
}

export type BreadcrumbCrumb = { id: string; code: string; label: string }
```

- [ ] **Step 2: Write the failing test**

```typescript
// apps/dashboard/modules/accounts/lib/account-balances.test.ts
import { describe, it, expect } from "vitest"
import { buildChildrenIndex, getChildRows, hasChildren, getBreadcrumbPath } from "./account-balances"
import type { AccountBalanceItem } from "../accounts.types"

const item = (id: string, parentId: string | null, code: string): AccountBalanceItem => ({
    id, parentId, code, name: id, type: "ASSET", isActive: true, ownBalance: 0, rolledBalance: 0,
})

const items: AccountBalanceItem[] = [
    item("assets", null, "1000"),
    item("cash", "assets", "1110"),
    item("bank", "assets", "1120"),
    item("petty", "cash", "1111"),
    item("orphan", "ghost", "9000"),
]

describe("buildChildrenIndex / getChildRows", () => {
    it("returns roots (incl. orphans) for null selection, sorted by code", () => {
        const index = buildChildrenIndex(items)
        const roots = getChildRows(index, null).map((r) => r.id)
        expect(roots).toEqual(["assets", "orphan"])
    })

    it("returns direct children of a selected node", () => {
        const index = buildChildrenIndex(items)
        expect(getChildRows(index, "assets").map((r) => r.id)).toEqual(["cash", "bank"])
        expect(getChildRows(index, "cash").map((r) => r.id)).toEqual(["petty"])
        expect(getChildRows(index, "petty")).toEqual([])
    })

    it("reports whether a node has children", () => {
        const index = buildChildrenIndex(items)
        expect(hasChildren(index, "assets")).toBe(true)
        expect(hasChildren(index, "petty")).toBe(false)
    })
})

describe("getBreadcrumbPath", () => {
    it("builds root→selected", () => {
        const byId = new Map(items.map((i) => [i.id, i]))
        expect(getBreadcrumbPath(byId, "petty").map((c) => c.id)).toEqual(["assets", "cash", "petty"])
    })

    it("returns [] for null", () => {
        const byId = new Map(items.map((i) => [i.id, i]))
        expect(getBreadcrumbPath(byId, null)).toEqual([])
    })

    it("is cycle-safe", () => {
        const cyclic = new Map<string, AccountBalanceItem>([
            ["p", item("p", "q", "1")],
            ["q", item("q", "p", "2")],
        ])
        expect(() => getBreadcrumbPath(cyclic, "p")).not.toThrow()
    })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @devloggers/dashboard test:unit -- account-balances`
Expected: FAIL — cannot find module `./account-balances`.

- [ ] **Step 4: Write the implementation**

```typescript
// apps/dashboard/modules/accounts/lib/account-balances.ts
import type { AccountBalanceItem, BreadcrumbCrumb } from "../accounts.types"

const ROOT_KEY = ""

/** parentId → children sorted by code; roots (incl. orphans) live under ROOT_KEY. */
export function buildChildrenIndex(items: AccountBalanceItem[]): Map<string, AccountBalanceItem[]> {
    const ids = new Set(items.map((i) => i.id))
    const index = new Map<string, AccountBalanceItem[]>()
    for (const item of items) {
        const key = item.parentId && ids.has(item.parentId) ? item.parentId : ROOT_KEY
        const list = index.get(key) ?? []
        list.push(item)
        index.set(key, list)
    }
    for (const list of index.values()) list.sort((a, b) => a.code.localeCompare(b.code))
    return index
}

export function getChildRows(index: Map<string, AccountBalanceItem[]>, selectedId: string | null): AccountBalanceItem[] {
    return index.get(selectedId ?? ROOT_KEY) ?? []
}

export function hasChildren(index: Map<string, AccountBalanceItem[]>, id: string): boolean {
    return (index.get(id)?.length ?? 0) > 0
}

/** root→selected crumbs; cycle-safe; empty when nothing is selected. */
export function getBreadcrumbPath(byId: Map<string, AccountBalanceItem>, selectedId: string | null): BreadcrumbCrumb[] {
    const crumbs: BreadcrumbCrumb[] = []
    const seen = new Set<string>()
    let current = selectedId ? byId.get(selectedId) : undefined
    while (current && !seen.has(current.id)) {
        seen.add(current.id)
        crumbs.unshift({ id: current.id, code: current.code, label: current.name })
        current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return crumbs
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @devloggers/dashboard test:unit -- account-balances`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/modules/accounts/accounts.types.ts apps/dashboard/modules/accounts/lib/account-balances.ts apps/dashboard/modules/accounts/lib/account-balances.test.ts
git commit -m "feat(accounts): balance item types + master-detail selectors"
```

---

## Task 8: Frontend — data hooks

**Files:**
- Create: `apps/dashboard/modules/accounts/hooks/use-account-balances.ts`
- Create: `apps/dashboard/modules/accounts/hooks/use-account-ledger.ts`
- Modify: `apps/dashboard/modules/accounts/hooks/index.ts`

**Interfaces:**
- Consumes: `useApi()`, `api.accounts.balances()`/`ledger()` (Task 6), `localize` (`@/shared/lib/localize`).
- Produces:
  - `ACCOUNT_BALANCES_KEY = ["account-balances"]` (exported for invalidation).
  - `useAccountBalances()` → `{ items: AccountBalanceItem[]; isLoading: boolean; ... }` (raw `useQuery` result with `items` derived via `select`).
  - `useAccountLedger(accountId: string | null, page: number, limit?: number)` → `useQuery` result of `{ data: AccountLedgerLine[]; total; page; limit }`.

- [ ] **Step 1: Write the balances hook**

```typescript
// apps/dashboard/modules/accounts/hooks/use-account-balances.ts
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import type { AccountBalanceItem } from "../accounts.types"

export const ACCOUNT_BALANCES_KEY = ["account-balances"] as const

type RawBalance = {
    id: string
    code: string
    name: string
    nameI18n?: unknown
    type: AccountBalanceItem["type"]
    parentId: string | null
    isActive: boolean
    ownBalance: number
    rolledBalance: number
}

export function useAccountBalances() {
    const api = useApi()
    return useQuery({
        queryKey: ACCOUNT_BALANCES_KEY,
        queryFn: () => api.accounts.balances(),
        staleTime: 30_000,
        select: (res): AccountBalanceItem[] => {
            const rows = ((res?.data ?? []) as unknown) as RawBalance[]
            return rows.map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                nameI18n: (r.nameI18n as AccountBalanceItem["nameI18n"]) ?? null,
                type: r.type,
                parentId: r.parentId ?? null,
                isActive: r.isActive,
                ownBalance: r.ownBalance,
                rolledBalance: r.rolledBalance,
                // feed the tree's inline balance display with the rolled figure
                currentBalance: r.rolledBalance,
            }))
        },
    })
}
```

> `api.accounts` is the client registered under the `chart-of-accounts` key in `createApi()`. Confirm the accessor: it is exposed as `api.accounts` in `packages/api-client/src/api.ts`. If the factory key differs, use the same accessor the existing `AccountsForm` uses: `api[accountResource.key]`.

- [ ] **Step 2: Write the ledger hook**

```typescript
// apps/dashboard/modules/accounts/hooks/use-account-ledger.ts
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import type { AccountLedgerLine } from "../accounts.types"

export type AccountLedgerPage = {
    data: AccountLedgerLine[]
    total: number
    page: number
    limit: number
}

export function useAccountLedger(accountId: string | null, page: number, limit = 50) {
    const api = useApi()
    return useQuery({
        queryKey: ["account-ledger", accountId, page, limit],
        enabled: !!accountId,
        queryFn: () => api.accounts.ledger(accountId as string, { page, limit } as never),
        select: (res): AccountLedgerPage => {
            const anyRes = res as unknown as { data?: AccountLedgerLine[]; meta?: { pagination?: { total?: number; page?: number; limit?: number } } }
            const pagination = anyRes.meta?.pagination
            return {
                data: (anyRes.data ?? []) as AccountLedgerLine[],
                total: pagination?.total ?? 0,
                page: pagination?.page ?? page,
                limit: pagination?.limit ?? limit,
            }
        },
    })
}
```

- [ ] **Step 3: Re-export from the hooks barrel**

Modify `apps/dashboard/modules/accounts/hooks/index.ts` — add (keep existing exports):

```typescript
export { useAccountBalances, ACCOUNT_BALANCES_KEY } from "./use-account-balances"
export { useAccountLedger, type AccountLedgerPage } from "./use-account-ledger"
```

- [ ] **Step 4: Verify it typechecks**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors in the two new hook files. (Fix the `api.accounts` accessor per the note in Step 1 if it errors.)

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/modules/accounts/hooks/
git commit -m "feat(accounts): balances & ledger query hooks"
```

---

## Task 9: Frontend — tree selection in manage mode

**Files:**
- Modify: `apps/dashboard/modules/accounts/components/accounts-tree.tsx`
- Modify: `apps/dashboard/modules/accounts/components/account-tree-node.tsx`

**Interfaces:**
- Produces: `AccountsTree` accepts `selectedId` + `onSelect` in `manage` mode (already in its `Props`); clicking a manage-mode row calls `onSelect(node)` and still toggles expansion for parents. Selected row gets the same highlight used in select mode.

- [ ] **Step 1: Generalize selection state in the node row**

In `apps/dashboard/modules/accounts/components/account-tree-node.tsx`, replace the select-mode-only derivations and click handler. Change these lines:

```typescript
    const isSelectMode = mode === "select"
    const canSelect = isSelectMode && selectable(node)
    const isSelected = isSelectMode && selectedId === node.id
    const isDisabledForSelect = isSelectMode && !canSelect

    const handleRowClick = () => {
        if (isSelectMode) {
            if (canSelect) onSelect?.(node)
            else if (hasChildren) onToggle(node.id)
            return
        }
        if (hasChildren) onToggle(node.id)
    }
```

to:

```typescript
    const isSelectMode = mode === "select"
    const canSelect = isSelectMode && selectable(node)
    const isSelected = selectedId === node.id
    const isDisabledForSelect = isSelectMode && !canSelect

    const handleRowClick = () => {
        if (isSelectMode) {
            if (canSelect) onSelect?.(node)
            else if (hasChildren) onToggle(node.id)
            return
        }
        // manage mode: select the node (drives the balances panel) and expand parents
        onSelect?.(node)
        if (hasChildren) onToggle(node.id)
    }
```

(`isSelected` now highlights in both modes; the existing `isSelected && "bg-primary/10 ring-1 ring-primary/30"` class already covers the visual.)

- [ ] **Step 2: Pass selection props through in manage mode**

In `apps/dashboard/modules/accounts/components/accounts-tree.tsx`, the `AccountTreeNodeRow` already receives `selectedId`, `selectable`, and `onSelect` from props — no change needed there. Confirm the `AccountsTree` render passes `selectedId={selectedId}` and `onSelect={onSelect}` (it does, at lines ~103-105). No edit required beyond Step 1 unless the props are not forwarded.

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/accounts/components/accounts-tree.tsx apps/dashboard/modules/accounts/components/account-tree-node.tsx
git commit -m "feat(accounts): allow node selection in tree manage mode"
```

---

## Task 10: Frontend — breadcrumb + balances table

**Files:**
- Create: `apps/dashboard/modules/accounts/components/account-breadcrumb.tsx`
- Create: `apps/dashboard/modules/accounts/components/account-balances-table.tsx`

**Interfaces:**
- Produces:
  - `AccountBreadcrumb({ crumbs, onSelect })` where `crumbs: BreadcrumbCrumb[]`, `onSelect(id: string | null): void` (root crumb passes `null`).
  - `AccountBalancesTable({ rows, index, showType, onDrill, onOpenLedger })` — renders rows; parent rows call `onDrill(id)`, leaf rows call `onOpenLedger(row)`.

- [ ] **Step 1: Create the breadcrumb**

```tsx
// apps/dashboard/modules/accounts/components/account-breadcrumb.tsx
"use client"

import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { BreadcrumbCrumb } from "../accounts.types"

export function AccountBreadcrumb({
    crumbs,
    onSelect,
}: {
    crumbs: BreadcrumbCrumb[]
    onSelect: (id: string | null) => void
}) {
    const t = useTranslations("business.resources.accounts")
    return (
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <button type="button" onClick={() => onSelect(null)} className="hover:text-foreground hover:underline">
                {t("breadcrumb.root")}
            </button>
            {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1
                return (
                    <span key={c.id} className="flex items-center gap-1">
                        <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />
                        <button
                            type="button"
                            onClick={() => onSelect(c.id)}
                            className={cn("hover:text-foreground hover:underline", isLast && "font-medium text-foreground")}
                        >
                            <code className="font-mono text-xs">{c.code}</code> {c.label}
                        </button>
                    </span>
                )
            })}
        </nav>
    )
}
```

- [ ] **Step 2: Create the balances table**

```tsx
// apps/dashboard/modules/accounts/components/account-balances-table.tsx
"use client"

import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { accountTypeMeta } from "../lib/account-types"
import { hasChildren } from "../lib/account-balances"
import type { AccountBalanceItem } from "../accounts.types"

function formatBalance(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AccountBalancesTable({
    rows,
    index,
    showType,
    onDrill,
    onOpenLedger,
}: {
    rows: AccountBalanceItem[]
    index: Map<string, AccountBalanceItem[]>
    showType?: boolean
    onDrill: (id: string) => void
    onOpenLedger: (row: AccountBalanceItem) => void
}) {
    const t = useTranslations("business.resources.accounts")

    if (rows.length === 0) {
        return <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("balances.empty")}</p>
    }

    return (
        <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                        <th className="px-3 py-2 text-start font-medium">{t("balances.columnCode")}</th>
                        <th className="px-3 py-2 text-start font-medium">{t("balances.columnName")}</th>
                        {showType && <th className="px-3 py-2 text-start font-medium">{t("balances.columnType")}</th>}
                        <th className="px-3 py-2 text-end font-medium">{t("balances.columnBalance")}</th>
                        <th className="w-8" />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const parent = hasChildren(index, row.id)
                        const meta = accountTypeMeta(row.type)
                        return (
                            <tr
                                key={row.id}
                                onClick={() => (parent ? onDrill(row.id) : onOpenLedger(row))}
                                className="cursor-pointer border-t transition-colors hover:bg-muted/40"
                            >
                                <td className="px-3 py-2">
                                    <code className="font-mono text-xs text-muted-foreground">{row.code}</code>
                                </td>
                                <td className="px-3 py-2">
                                    <span className={cn(!row.isActive && "text-muted-foreground line-through")}>{row.name}</span>
                                    {!row.isActive && (
                                        <Badge variant="outline" className="ms-2 text-[10px]">{t("inactive")}</Badge>
                                    )}
                                </td>
                                {showType && (
                                    <td className="px-3 py-2">
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className={cn("size-1.5 rounded-full", meta.dotClass)} aria-hidden />
                                            {t(`types.${meta.labelKey}`)}
                                        </span>
                                    </td>
                                )}
                                <td className={cn(
                                    "px-3 py-2 text-end font-mono tabular-nums",
                                    row.rolledBalance < 0 ? "text-destructive" : "text-foreground",
                                )}>
                                    {formatBalance(row.rolledBalance)}
                                </td>
                                <td className="pe-2 text-muted-foreground">
                                    {parent && <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors (i18n keys are added in Task 12 — typecheck does not validate message keys).

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/accounts/components/account-breadcrumb.tsx apps/dashboard/modules/accounts/components/account-balances-table.tsx
git commit -m "feat(accounts): breadcrumb + balances table components"
```

---

## Task 11: Frontend — account ledger view

**Files:**
- Create: `apps/dashboard/modules/accounts/components/account-ledger-view.tsx`

**Interfaces:**
- Consumes: `useAccountLedger` (Task 8), `AccountBalanceItem` (for header).
- Produces: `AccountLedgerView({ account, onBack })` — fetches the ledger with internal page state and renders a back button, header (code/name + rolled balance), a lines table, and prev/next pagination.

- [ ] **Step 1: Create the component**

```tsx
// apps/dashboard/modules/accounts/components/account-ledger-view.tsx
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAccountLedger } from "../hooks"
import type { AccountBalanceItem } from "../accounts.types"

function fmt(n: number): string {
    return n === 0 ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AccountLedgerView({ account, onBack }: { account: AccountBalanceItem; onBack: () => void }) {
    const t = useTranslations("business.resources.accounts")
    const [page, setPage] = useState(1)
    const limit = 50
    const { data, isLoading } = useAccountLedger(account.id, page, limit)

    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft className="size-4 rtl:rotate-180" />
                    {t("ledger.back")}
                </Button>
                <div className="text-end">
                    <div className="text-sm font-medium">
                        <code className="font-mono text-xs text-muted-foreground">{account.code}</code> {account.name}
                    </div>
                    <div className={cn("font-mono text-xs tabular-nums", account.rolledBalance < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {t("ledger.balanceLabel")}: {account.rolledBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-1">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                </div>
            ) : (data?.data.length ?? 0) === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("ledger.empty")}</p>
            ) : (
                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2 text-start font-medium">{t("ledger.date")}</th>
                                <th className="px-3 py-2 text-start font-medium">{t("ledger.entry")}</th>
                                <th className="px-3 py-2 text-start font-medium">{t("ledger.description")}</th>
                                <th className="px-3 py-2 text-end font-medium">{t("ledger.debit")}</th>
                                <th className="px-3 py-2 text-end font-medium">{t("ledger.credit")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data!.data.map((line) => (
                                <tr key={line.id} className="border-t">
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                        {new Date(line.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 py-2">
                                        <code className="font-mono text-xs">{line.entryNumber}</code>
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">{line.description ?? "—"}</td>
                                    <td className="px-3 py-2 text-end font-mono tabular-nums">{fmt(line.debit)}</td>
                                    <td className="px-3 py-2 text-end font-mono tabular-nums">{fmt(line.credit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {total > limit && (
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                    <span>{t("ledger.pageOf", { page, total: totalPages })}</span>
                    <Button type="button" variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        <ChevronLeft className="size-4 rtl:rotate-180" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        <ChevronRight className="size-4 rtl:rotate-180" />
                    </Button>
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/accounts/components/account-ledger-view.tsx
git commit -m "feat(accounts): per-account ledger detail view"
```

---

## Task 12: Frontend — main panel, page rebuild, CRUD invalidation, i18n

**Files:**
- Create: `apps/dashboard/modules/accounts/components/account-balances-panel.tsx`
- Modify: `apps/dashboard/modules/accounts/components/accounts-page.tsx`
- Modify: `apps/dashboard/modules/accounts/components/accounts-form.tsx`
- Modify: `apps/dashboard/messages/en.json`, `ar.json`, `tr.json`

**Interfaces:**
- Consumes: `useAccountBalances` (Task 8), selectors (Task 7), `AccountBreadcrumb`/`AccountBalancesTable` (Task 10), `AccountLedgerView` (Task 11), `ACCOUNT_TYPE_ORDER`/`accountTypeMeta` (lib), `ACCOUNT_BALANCES_KEY` (Task 8).
- Produces: `AccountBalancesPanel({ items, selectedId, onSelectAccount })`; rebuilt `AccountsPage` two-column layout.

- [ ] **Step 1: Create the main panel**

```tsx
// apps/dashboard/modules/accounts/components/account-balances-panel.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"
import { buildChildrenIndex, getChildRows, getBreadcrumbPath } from "../lib/account-balances"
import { ACCOUNT_TYPE_ORDER, accountTypeMeta } from "../lib/account-types"
import { AccountBreadcrumb } from "./account-breadcrumb"
import { AccountBalancesTable } from "./account-balances-table"
import { AccountLedgerView } from "./account-ledger-view"
import type { AccountBalanceItem } from "../accounts.types"

export function AccountBalancesPanel({
    items,
    selectedId,
    onSelectAccount,
}: {
    items: AccountBalanceItem[]
    selectedId: string | null
    onSelectAccount: (id: string | null) => void
}) {
    const t = useTranslations("business.resources.accounts")
    const [ledgerAccount, setLedgerAccount] = useState<AccountBalanceItem | null>(null)

    // Leaving the current account closes any open ledger.
    useEffect(() => { setLedgerAccount(null) }, [selectedId])

    const index = useMemo(() => buildChildrenIndex(items), [items])
    const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
    const crumbs = useMemo(() => getBreadcrumbPath(byId, selectedId), [byId, selectedId])
    const rows = useMemo(() => getChildRows(index, selectedId), [index, selectedId])

    const selected = selectedId ? byId.get(selectedId) : undefined

    if (ledgerAccount) {
        return (
            <div className="rounded-lg border bg-card p-4">
                <AccountLedgerView account={ledgerAccount} onBack={() => setLedgerAccount(null)} />
            </div>
        )
    }

    return (
        <div className="space-y-4 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <AccountBreadcrumb crumbs={crumbs} onSelect={onSelectAccount} />
                {selected && (
                    <div className={cn(
                        "font-mono text-sm tabular-nums",
                        selected.rolledBalance < 0 ? "text-destructive" : "text-foreground",
                    )}>
                        {selected.rolledBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                )}
            </div>

            {selectedId === null ? (
                <div className="space-y-6">
                    {ACCOUNT_TYPE_ORDER.map((type) => {
                        const typeRows = rows.filter((r) => r.type === type)
                        if (typeRows.length === 0) return null
                        const meta = accountTypeMeta(type)
                        const Icon = meta.icon
                        return (
                            <section key={type}>
                                <header className="mb-2 flex items-center gap-2 px-1">
                                    <Icon className={cn("size-4", meta.badgeClass.split(" ").find((c) => c.startsWith("text-")))} />
                                    <h3 className="text-sm font-semibold">{t(`types.${meta.labelKey}`)}</h3>
                                </header>
                                <AccountBalancesTable
                                    rows={typeRows}
                                    index={index}
                                    onDrill={onSelectAccount}
                                    onOpenLedger={setLedgerAccount}
                                />
                            </section>
                        )
                    })}
                </div>
            ) : (
                <AccountBalancesTable
                    rows={rows}
                    index={index}
                    onDrill={onSelectAccount}
                    onOpenLedger={setLedgerAccount}
                />
            )}
        </div>
    )
}
```

- [ ] **Step 2: Rebuild the page into two columns**

Replace the body of `apps/dashboard/modules/accounts/components/accounts-page.tsx`. Keep the existing `TreeSkeleton`, `AddRootButton`, and imports; make these changes:

1. Add imports:

```typescript
import { useAccountBalances } from "../hooks"
import { AccountBalancesPanel } from "./account-balances-panel"
```

2. Change `AccountsTreePanel` to source items from the balances query and accept selection. Replace its signature and body's data source:

```tsx
function AccountsTreePanel({
    query,
    treeRef,
    items,
    isLoading,
    selectedId,
    onSelect,
}: {
    query: string
    treeRef: React.RefObject<AccountsTreeHandle | null>
    items: AccountListItem[]
    isLoading: boolean
    selectedId: string | null
    onSelect: (id: string | null) => void
}) {
    const t = useTranslations("business.resources.accounts")
    const resource = useAccountsResource()
    const setDraft = useAccountDraftStore((s) => s.setDraft)
    const clearDraft = useAccountDraftStore((s) => s.clear)

    useEffect(() => {
        if (!resource.isDialogOpen) clearDraft()
    }, [resource.isDialogOpen, clearDraft])

    const onAddChild = (node: AccountTreeNode) => {
        setDraft({ parent: { id: node.id, code: node.account.code, name: node.label }, type: node.account.type })
        resource.openCreate()
    }
    const onEdit = (node: AccountTreeNode) => {
        const raw = resource.items.find((i) => String(i.id) === node.id)
        if (raw) resource.openEdit(raw)
    }
    const onDelete = async (node: AccountTreeNode) => {
        const confirmed = await confirm({
            title: t("deleteTitle"),
            description: t("deleteDescription", { name: node.label }),
            confirmLabel: t("delete"),
            variant: "destructive",
        })
        if (!confirmed) return
        try {
            await resource.deleteItem(node.id)
        } catch (err) {
            const message = err instanceof ApiError ? err.message : t("deleteFailed")
            await confirm({ title: t("deleteFailed"), description: message, confirmLabel: t("ok") })
        }
    }

    return (
        <div className="rounded-lg border bg-card p-3">
            {isLoading ? (
                <TreeSkeleton />
            ) : items.length === 0 ? (
                <Empty className="border-0 py-10">
                    <EmptyHeader>
                        <EmptyMedia variant="icon"><BookOpen /></EmptyMedia>
                        <EmptyDescription>{t("empty")}</EmptyDescription>
                    </EmptyHeader>
                    <AddRootButton />
                </Empty>
            ) : (
                <AccountsTree
                    ref={treeRef}
                    items={items}
                    query={query}
                    mode="manage"
                    selectedId={selectedId}
                    onSelect={(node) => onSelect(node.id)}
                    actions={{ onAddChild, onEdit, onDelete }}
                />
            )}
        </div>
    )
}
```

3. Rebuild the `AccountsPage` export to hold selection state, fetch balances, and lay out two columns:

```tsx
export function AccountsPage() {
    const t = useTranslations("business.resources.accounts")
    const [query, setQuery] = useState("")
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const treeRef = useRef<AccountsTreeHandle>(null)
    const { data: items = [], isLoading } = useAccountBalances()

    return (
        <AccountsResource>
            <AccountsResource.Page
                title={t("title")}
                toolbar={
                    <AccountsResource.Toolbar>
                        <AccountsResource.Toolbar.Start>
                            <div className="flex items-center gap-1">
                                <IconTooltip label={t("expandAll")}>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => treeRef.current?.expandAll()}>
                                        <ChevronsUpDown className="size-4" />
                                    </Button>
                                </IconTooltip>
                                <IconTooltip label={t("collapseAll")}>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => treeRef.current?.collapseAll()}>
                                        <ChevronsDownUp className="size-4" />
                                    </Button>
                                </IconTooltip>
                            </div>
                        </AccountsResource.Toolbar.Start>
                        <AccountsResource.Toolbar.Center>
                            <InputGroup>
                                <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
                                <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} />
                                {query && (
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton onClick={() => setQuery("")} aria-label={t("clear")}>
                                            <X className="size-3.5" />
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                )}
                            </InputGroup>
                        </AccountsResource.Toolbar.Center>
                    </AccountsResource.Toolbar>
                }
                actions={
                    <AccountsResource.FormDialog
                        title={(it) => (it?.id ? t("editTitle") : t("addAction"))}
                        form={AccountsForm}
                    />
                }
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
                    <AccountsTreePanel
                        query={query}
                        treeRef={treeRef}
                        items={items}
                        isLoading={isLoading}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                    />
                    <AccountBalancesPanel
                        items={items}
                        selectedId={selectedId}
                        onSelectAccount={setSelectedId}
                    />
                </div>
            </AccountsResource.Page>
        </AccountsResource>
    )
}
```

> `items` from `useAccountBalances()` is `AccountBalanceItem[]`, which is `AccountListItem & {...}` — structurally valid wherever `AccountListItem[]` is expected (tree, `resource` edit lookup). The tree still shows inline balances because the adapter set `currentBalance = rolledBalance`.

- [ ] **Step 3: Invalidate balances on CRUD success**

In `apps/dashboard/modules/accounts/components/accounts-form.tsx`, import the query client and the key, and wrap `onSuccess`. Add imports:

```typescript
import { useQueryClient } from "@tanstack/react-query"
import { ACCOUNT_BALANCES_KEY } from "../hooks"
```

Inside `AccountsForm`, add `const queryClient = useQueryClient()` near the other hooks, and change the controller's `onSuccess` wiring from `onSuccess,` to:

```typescript
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY })
            onSuccess?.()
        },
```

Also invalidate after delete: in `accounts-page.tsx` `AccountsTreePanel.onDelete`, after `await resource.deleteItem(node.id)` add:

```typescript
            const { useQueryClient } = await import("@tanstack/react-query") // if not already imported at top
```

Instead of a dynamic import, add `import { useQueryClient } from "@tanstack/react-query"` and `import { ACCOUNT_BALANCES_KEY } from "../hooks"` at the top of `accounts-page.tsx`, call `const queryClient = useQueryClient()` inside `AccountsTreePanel`, and after a successful `resource.deleteItem(node.id)` call `queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY })`.

- [ ] **Step 4: Add i18n keys (en)**

In `apps/dashboard/messages/en.json`, under `business.resources.accounts`, add:

```json
"breadcrumb": { "root": "All accounts" },
"balances": {
  "columnCode": "Code",
  "columnName": "Account",
  "columnType": "Type",
  "columnBalance": "Balance",
  "empty": "No sub-accounts to display."
},
"ledger": {
  "back": "Back",
  "title": "Ledger",
  "balanceLabel": "Balance",
  "date": "Date",
  "entry": "Entry",
  "description": "Description",
  "reference": "Reference",
  "debit": "Debit",
  "credit": "Credit",
  "empty": "No journal lines posted to this account yet.",
  "pageOf": "Page {page} of {total}"
}
```

- [ ] **Step 5: Add i18n keys (ar)**

In `apps/dashboard/messages/ar.json`, under `business.resources.accounts`, add:

```json
"breadcrumb": { "root": "كل الحسابات" },
"balances": {
  "columnCode": "الرمز",
  "columnName": "الحساب",
  "columnType": "النوع",
  "columnBalance": "الرصيد",
  "empty": "لا توجد حسابات فرعية للعرض."
},
"ledger": {
  "back": "رجوع",
  "title": "دفتر الأستاذ",
  "balanceLabel": "الرصيد",
  "date": "التاريخ",
  "entry": "القيد",
  "description": "الوصف",
  "reference": "المرجع",
  "debit": "مدين",
  "credit": "دائن",
  "empty": "لا توجد قيود مرحّلة على هذا الحساب بعد.",
  "pageOf": "صفحة {page} من {total}"
}
```

- [ ] **Step 6: Add i18n keys (tr)**

In `apps/dashboard/messages/tr.json`, under `business.resources.accounts`, add:

```json
"breadcrumb": { "root": "Tüm hesaplar" },
"balances": {
  "columnCode": "Kod",
  "columnName": "Hesap",
  "columnType": "Tür",
  "columnBalance": "Bakiye",
  "empty": "Gösterilecek alt hesap yok."
},
"ledger": {
  "back": "Geri",
  "title": "Defter",
  "balanceLabel": "Bakiye",
  "date": "Tarih",
  "entry": "Kayıt",
  "description": "Açıklama",
  "reference": "Referans",
  "debit": "Borç",
  "credit": "Alacak",
  "empty": "Bu hesaba henüz kayıt işlenmedi.",
  "pageOf": "Sayfa {page} / {total}"
}
```

> Place each block inside the existing `business.resources.accounts` object (merge — do not create a second `accounts` key). Ensure JSON stays valid (commas between siblings).

- [ ] **Step 7: Verify typecheck + unit tests + lint**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: no errors.
Run: `pnpm --filter @devloggers/dashboard test:unit -- account-balances`
Expected: PASS.
Run: `pnpm --filter @devloggers/dashboard lint`
Expected: no new errors in touched files.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/modules/accounts/components/ apps/dashboard/messages/
git commit -m "feat(accounts): master-detail balances explorer page"
```

---

## Task 13: Full-stack verification

**Files:** none (verification only).

- [ ] **Step 1: Backend build + tests**

Run: `pnpm turbo run build --filter=@devloggers/api`
Expected: success.
Run: `pnpm --filter @devloggers/api test -- account-balances roll-up-balances`
Expected: PASS.

- [ ] **Step 2: Dashboard build**

Run: `pnpm --filter @devloggers/dashboard build`
Expected: success (this also runs `generate` via `prebuild`).

- [ ] **Step 3: Manual smoke (dev servers running)**

Start: `pnpm --filter @devloggers/api dev` and `pnpm --filter @devloggers/dashboard dev`.
Verify at `/finance/chart-of-accounts`:
1. Tree loads on the left; main panel shows top-level accounts grouped by type with balances.
2. Clicking a parent (tree or table row) drills the main table into its children; breadcrumb updates.
3. Clicking a leaf row opens the ledger view with journal lines; Back returns to the table.
4. Balances are non-zero for accounts with posted entries, and parents show the sum of their children.
5. Create/edit/delete an account → tree and balances refresh (no manual reload).
6. Switch locale to `ar` → RTL layout, translated headers, chevrons mirrored.

- [ ] **Step 4: Final commit (if any lint/format fixups)**

```bash
git add -A
git commit -m "chore(accounts): verification fixups for balances explorer"
```

---

## Self-Review

**Spec coverage:**
- Ledger-computed balances endpoint (compute-on-read, POSTED-only, grouped query) → Tasks 3, 4, 5. ✓
- Post-order rollup with cycle guard → Task 1 (util) + Task 4 (wired). ✓
- Per-account ledger endpoint (paginated) → Tasks 3, 4, 5. ✓
- Separate controller / route-collision avoidance → Task 5 (distinct `accounting/account-balances` base path — resolves the spec's flagged risk). ✓
- Contracts routes + client methods + regen → Tasks 5, 6. ✓
- Two-column master-detail, tree navigator + CRUD retained → Tasks 9, 12. ✓
- Main table = children of selection; roots grouped by type when null → Tasks 7, 10, 12. ✓
- Row click: parent drills, leaf opens ledger (takes over panel) → Tasks 10, 11, 12. ✓
- Clickable breadcrumb → Tasks 10, 12. ✓
- CRUD invalidates balances query → Task 12. ✓
- i18n en/ar/tr, RTL, money formatting → Tasks 10–12 + Global Constraints. ✓
- Edge cases (orphan→root, cycle guard, inactive muted, empty ledger, zero balance) → Tasks 1, 7, 10, 11. ✓
- Tests (backend rollup/sign/ledger; frontend selectors) → Tasks 1, 4, 7. ✓
- Out of scope (as-of filter, running balance, currency prefix, toggles, cache repair) → not implemented, per spec. ✓

**Placeholder scan:** No TBD/TODO; every code step has full code; commands have expected output. ✓

**Type consistency:** `AccountBalanceItem` (Task 7) reused across hooks (8), table (10), panel (12); `ACCOUNT_BALANCES_KEY` defined in Task 8, consumed in Task 12; `getChildRows`/`buildChildrenIndex`/`hasChildren`/`getBreadcrumbPath` signatures consistent between Task 7 definition and Tasks 10/12 usage; `rollUpBalances(BalanceNode[])` defined in Task 1, consumed in Task 4; `AccountBalanceDto`/`AccountLedgerLineDto` defined in Task 2, used in Tasks 4/5. ✓
