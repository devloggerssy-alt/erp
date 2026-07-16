# Accounting COA Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the ERP accounting layer to enforce leaf/posting semantics on the Chart of Accounts, replace the denormalized `currentBalance` with computed-on-read balances, ship a lazy per-level balances API, and route every posting flow through a single validating facade — closing the audit gaps (fiscal-period on Expenses/Payments, FS slot typing, `referenceType` enum, reversal-date discipline, stock-count/opening cancellation, soft delete).

**Architecture:** Vertical-slice contract lock — Phase 1 builds the schema (`isPostable`/`isContra`/`deletedAt`, drop `currentBalance`, `ReferenceType` enum, `reversalOfId`/`reversalDate`) and the `JournalPostingService` facade with shared validation helpers. Phase 2 sweeps every consumer to the facade. Phase 3 ships the two lazy balances endpoints + dashboard rewrite. Phase 4 fills the stock-count/opening-balance cancellation flows. Phases are review checkpoints of a single release, not separately shipped releases.

**Tech Stack:** NestJS 11, Prisma 7 (PostgreSQL), TypeScript 5.9, Jest 30 / ts-jest, Next.js (App Router), TanStack Query, Zod/class-validator, pnpm 9 workspace + Turborepo.

## Global Constraints

- All new schema columns:
  - `ChartOfAccount.isPostable Boolean @default(true) @map("is_postable")`
  - `ChartOfAccount.isContra   Boolean @default(false) @map("is_contra")`
  - `ChartOfAccount.deletedAt  DateTime? @map("deleted_at")`
  - `JournalEntry.reversalOfId String? @map("reversal_of_id")` (self-FK)
  - `JournalEntry.reversalDate DateTime? @map("reversal_date")`
- Dropped: `ChartOfAccount.currentBalance` column (no backfill; project is in dev).
- Replaced: `JournalEntry.referenceType String?` → `JournalEntry.referenceType ReferenceType?` with new Prisma enum `ReferenceType` having values: `INVOICE`, `INVOICE_CANCELLATION`, `PAYMENT`, `PAYMENT_CANCELLATION`, `EXPENSE`, `EXPENSE_CANCELLATION`, `OPENING_BALANCE`, `OPENING_BALANCE_CANCELLATION`, `STOCK_COUNT`, `STOCK_COUNT_CANCELLATION`.
- New indexes: `ChartOfAccount(parentId)`, `JournalEntry(referenceType, referenceId)`, `JournalLine(accountId)`.
- Project in dev — re-seed + reset migrations from scratch is allowed. Run `pnpm --filter @devloggers/db-prisma db:reset` after schema edits if the local DB diverges.
- Test command repository-wide: `pnpm --filter @devloggers/api test` (Jest, `.*\.spec\.ts$`, `rootDir: src`, ts-jest). Per-file: `pnpm --filter @devloggers/api test -- <path>`.
- Typecheck: `pnpm turbo run build --filter=@devloggers/api` (and equivalent for `@devloggers/dashboard`, `@devloggers/api-client`, `@devloggers/api-contracts`).
- OpenAPI regen: `pnpm generate` from repo root (= `pnpm --filter @devloggers/api generate:spec && pnpm --filter @devloggers/api-contracts build`).
- Prisma generate after schema edits: `pnpm --filter @devloggers/db-prisma db:generate`. Migrate: `pnpm --filter @devloggers/db-prisma db:migrate:dev --name <name>`.
- Lint per package: `pnpm --filter @devloggers/api lint` etc.
- ERP rule (from AGENTS.md): no comments in generated code unless explicitly requested.
- Golden reference for backend resource modules: `apps/api/src/modules/catalog/units/`. Mirror its 4-layer pattern (Repository → Service → Presenter → Controller).

---

## Phase 1 — Schema + facade + shared helpers

### Task 1.1: Add `isPostable`, `isContra`, `deletedAt` to `ChartOfAccount`; drop `currentBalance`

**Files:**
- Modify: `packages/db-prisma/src/schema/accounting.prisma` (lines 17–55 model block)

**Interfaces:**
- Consumes: nothing
- Produces: `ChartOfAccount` Prisma model with new columns; existing relations unchanged. Downstream TS types update after `prisma generate`.

- [ ] **Step 1: Edit the `ChartOfAccount` model**

Replace the column block in `packages/db-prisma/src/schema/accounting.prisma`:

```prisma
model ChartOfAccount {
    id         String      @id @default(uuid())
    tenantId   String      @map("tenant_id")
    code       String
    name       Json        @db.JsonB
    type       AccountType
    parentId   String?     @map("parent_id")
    isActive   Boolean     @default(true) @map("is_active")
    isPostable Boolean     @default(true) @map("is_postable")
    isContra   Boolean     @default(false) @map("is_contra")
    deletedAt  DateTime?   @map("deleted_at")
    createdAt  DateTime    @default(now()) @map("created_at")
    updatedAt  DateTime    @updatedAt @map("updated_at")

    tenant       Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    parent       ChartOfAccount?  @relation("AccountHierarchy", fields: [parentId], references: [id])
    children     ChartOfAccount[] @relation("AccountHierarchy")
    journalLines    JournalLine[]
    expenseItems    ExpenseItem[]    @relation("ExpenseItemAccount")
    linkedCashboxes Cashbox[]        @relation("CashboxLinkedAccount")
    defaultSalesFor      FinancialSetting[] @relation("DefaultSalesAccount")
    defaultPurchaseFor   FinancialSetting[] @relation("DefaultPurchaseAccount")
    defaultTaxFor        FinancialSetting[] @relation("DefaultTaxAccount")
    defaultReceivableFor FinancialSetting[] @relation("DefaultReceivableAccount")
    defaultPayableFor    FinancialSetting[] @relation("DefaultPayableAccount")
    defaultInventoryFor           FinancialSetting[] @relation("DefaultInventoryAccount")
    defaultCogsFor                FinancialSetting[] @relation("DefaultCogsAccount")
    defaultInventoryAdjustmentFor FinancialSetting[] @relation("DefaultInventoryAdjustmentAccount")
    defaultOpeningEquityFor       FinancialSetting[] @relation("DefaultOpeningEquityAccount")
    partyReceivables Party[] @relation("PartyReceivableAccount")
    partyPayables    Party[] @relation("PartyPayableAccount")
    // REMOVED: currentBalance Decimal (source of truth is JournalLine; balances computed on read)

    @@unique([tenantId, code])
    @@index([tenantId])
    @@index([parentId])
    @@map("chart_of_accounts")
}
```

- [ ] **Step 2: Run prisma generate and migrate**

Run:
```bash
pnpm --filter @devloggers/db-prisma db:generate
pnpm --filter @devloggers/db-prisma db:reset
pnpm --filter @devloggers/db-prisma db:migrate:dev --name coa_postable_soft_delete
```

Expected: migration created; `currentBalance` column absent in generated client; `isPostable`, `isContra`, `deletedAt` present on the `ChartOfAccount` type.

- [ ] **Step 3: Verify the ts client types update**

Run:
```bash
pnpm turbo run build --filter=@devloggers/db-prisma
```

Expected: build succeeds.

- [ ] **Step 4: Grep the repo for `currentBalance` references to scope the upcoming edits**

Run:
```bash
rg -n "currentBalance" apps packages
```

Expected: matches in `apps/api/src/modules/accounting/accounts/utils/account-balance.utils.ts`, `apps/api/src/modules/invoicing/**/*.ts` (callers of `updateAccountBalances`), and possibly seeds. Record the list — these will be removed in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add packages/db-prisma/src/schema/accounting.prisma packages/db-prisma/generated packages/db-prisma/migrations
git commit -m "feat(db): add ChartOfAccount.isPostable/isContra/deletedAt; drop currentBalance"
```

---

### Task 1.2: Add `ReferenceType` enum, `reversalOfId`, `reversalDate` to `JournalEntry`; indexes

**Files:**
- Modify: `packages/db-prisma/src/schema/accounting.prisma` (`JournalEntry`, `JournalLine` blocks, new enum)

**Interfaces:**
- Consumes: nothing
- Produces: `ReferenceType` enum (Prisma) + self-relation on `JournalEntry`. `JournalEntry.referenceType` becomes enum-typed.

- [ ] **Step 1: Edit the schema**

Append the enum (place next to `AccountType` enum near the top of the file):

```prisma
enum ReferenceType {
    INVOICE
    INVOICE_CANCELLATION
    PAYMENT
    PAYMENT_CANCELLATION
    EXPENSE
    EXPENSE_CANCELLATION
    OPENING_BALANCE
    OPENING_BALANCE_CANCELLATION
    STOCK_COUNT
    STOCK_COUNT_CANCELLATION
}
```

Replace the `JournalEntry` model:

```prisma
model JournalEntry {
    id             String             @id @default(uuid())
    tenantId       String             @map("tenant_id")
    number         String
    date           DateTime
    fiscalPeriodId String             @map("fiscal_period_id")
    referenceType  ReferenceType?     @map("reference_type")
    referenceId    String?            @map("reference_id")
    description    String?
    status         JournalEntryStatus @default(DRAFT)
    exchangeRate   Decimal            @default(1) @map("exchange_rate") @db.Decimal(18, 6)
    postedAt       DateTime?          @map("posted_at")
    reversalOfId   String?            @map("reversal_of_id")
    reversalDate   DateTime?          @map("reversal_date")
    createdBy      String             @map("created_by")
    createdAt      DateTime           @default(now()) @map("created_at")
    updatedAt      DateTime           @updatedAt @map("updated_at")

    tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    fiscalPeriod FiscalPeriod @relation(fields: [fiscalPeriodId], references: [id])
    reversalOf   JournalEntry?  @relation("JournalReversals", fields: [reversalOfId], references: [id])
    reversedBy   JournalEntry[] @relation("JournalReversals")
    lines        JournalLine[]

    @@unique([tenantId, number])
    @@index([tenantId])
    @@index([referenceType, referenceId])
    @@map("journal_entries")
}
```

Add the `accountId` index to `JournalLine`:

```prisma
model JournalLine {
    id             String   @id @default(uuid())
    tenantId       String   @map("tenant_id")
    journalEntryId String   @map("journal_entry_id")
    accountId      String   @map("account_id")
    partyId        String?  @map("party_id")
    debit          Decimal  @default(0) @db.Decimal(18, 4)
    credit         Decimal  @default(0) @db.Decimal(18, 4)
    description    String?
    sortOrder      Int      @default(0) @map("sort_order")

    journalEntry JournalEntry   @relation(fields: [jouralEntryId], references: [id], onDelete: Cascade)
    account      ChartOfAccount @relation(fields: [accountId], references: [id])
    party        Party?         @relation("JournalLineParty", fields: [partyId], references: [id])

    @@index([tenantId])
    @@index([journalEntryId])
    @@index([accountId])
    @@map("journal_lines")
}
```

- [ ] **Step 2: Regenerate + migrate**

```bash
pnpm --filter @devloggers/db-prisma db:generate
pnpm --filter @devloggers/db-prisma db:migrate:dev --name reference_type_enum_reversal
```

Expected: migration applies; `ReferenceType` exported from `@devloggers/db-prisma`.

- [ ] **Step 3: Confirm enum export**

Run:
```bash
rg -n "export.*ReferenceType" packages/db-prisma/src
```

Expected: at least one re-export line. If none, add `export { ReferenceType } from '../generated/...';` to `packages/db-prisma/src/index.ts` (mirror how `JournalEntryStatus` is exported today).

- [ ] **Step 4: Commit**

```bash
git add packages/db-prisma
git commit -m "feat(db): ReferenceType enum, JournalEntry.reversalOfId/reversalDate, new indexes"
```

---

### Task 1.3: Mirror `ReferenceType` TS const in `api-contracts`

**Files:**
- Modify: `packages/api-contracts/src/resources/account.resource.ts`
- Create: `packages/api-contracts/src/resources/accounting.types.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `ReferenceType` TS constant object + exported type, importable from `@devloggers/api-contracts`. Dashboard + API builders import from here.

- [ ] **Step 1: Create the accounting types file**

`packages/api-contracts/src/resources/accounting.types.ts`:

```ts
export const REFERENCE_TYPES = [
  'INVOICE', 'INVOICE_CANCELLATION',
  'PAYMENT', 'PAYMENT_CANCELLATION',
  'EXPENSE', 'EXPENSE_CANCELLATION',
  'OPENING_BALANCE', 'OPENING_BALANCE_CANCELLATION',
  'STOCK_COUNT', 'STOCK_COUNT_CANCELLATION',
] as const

export type ReferenceType = typeof REFERENCE_TYPES[number]
```

- [ ] **Step 2: Add `referenceType` constants to existing `account.resource.ts` if it has route ring-around. (Skip if not needed.) — verify the existing resource file imports nothing yet.**

(No edit to `account.resource.ts` in this task; route edits land with the lazy balances tasks. Read the file and confirm no `referenceType` reference exists.)

Run:
```bash
rg -n "referenceType" packages/api-contracts/src
```

Expected: no matches yet.

- [ ] **Step 3: Re-export from the resources barrel**

Append to `packages/api-contracts/src/resources/index.ts`:

```ts
export * from './accounting.types'
```

- [ ] **Step 4: Build + commit**

```bash
pnpm turbo run build --filter=@devloggers/api-contracts
git add packages/api-contracts
git commit -m "feat(api-contracts): ReferenceType TS const mirror"
```

---

### Task 1.4: New `account-normal-side.ts` helper with `isContra` (replaces `account-balance.utils.ts` delta)

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/utils/account-normal-side.ts`
- Create: `apps/api/src/modules/accounting/accounts/utils/account-normal-side.spec.ts`
- (Do NOT delete `account-balance.utils.ts` yet — `updateAccountBalances` still referenced by the facade swap task. We delete both in Task 1.6.)

**Interfaces:**
- Consumes: `AccountType` from `@devloggers/db-prisma`.
- Produces: `getAccountBalanceDelta(type, isContra, debit, credit): number`. Used by read path (balances) and any writer needing delta.

- [ ] **Step 1: Write the failing test**

`apps/api/src/modules/accounting/accounts/utils/account-normal-side.spec.ts`:

```ts
import { getAccountBalanceDelta } from './account-normal-side'

describe('getAccountBalanceDelta', () => {
  it('treats ASSET/EXPENSE as debit-normal', () => {
    expect(getAccountBalanceDelta('ASSET', false, 300, 100)).toBe(200)
    expect(getAccountBalanceDelta('EXPENSE', false, 50, 0)).toBe(50)
  })
  it('treats LIABILITY/EQUITY/REVENUE as credit-normal', () => {
    expect(getAccountBalanceDelta('LIABILITY', false, 0, 500)).toBe(500)
    expect(getAccountBalanceDelta('REVENUE', false, 100, 0)).toBe(-100)
    expect(getAccountBalanceDelta('EQUITY', false, 0, 1000)).toBe(1000)
  })
  it('inverts the normal side when isContra=true', () => {
    expect(getAccountBalanceDelta('ASSET', true, 0, 400)).toBe(400) // Accumulated Depreciation: credit increases
    expect(getAccountBalanceDelta('ASSET', true, 200, 0)).toBe(-200)
    expect(getAccountBalanceDelta('REVENUE', true, 100, 0)).toBe(100) // Sales returns
    expect(getAccountBalanceDelta('REVENUE', true, 0, 100)).toBe(-100)
  })
  it('zero debit/credit yields zero delta', () => {
    expect(getAccountBalanceDelta('ASSET', false, 0, 0)).toBe(0)
    expect(getAccountBalanceDelta('ASSET', true, 0, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test (expect fail — module missing)**

```bash
pnpm --filter @devloggers/api test -- account-normal-side.spec
```

Expected: FAIL ("Cannot find module './account-normal-side'").

- [ ] **Step 3: Write the implementation**

`apps/api/src/modules/accounting/accounts/utils/account-normal-side.ts`:

```ts
import type { AccountType } from '@devloggers/db-prisma'

/**
 * Signed balance delta for a journal line, respecting the account's normal side
 * and any contra inversion.
 *
 * Normal balance rules:
 *   - ASSET / EXPENSE → debit-normal (debit increases, credit decreases)
 *   - LIABILITY / EQUITY / REVENUE → credit-normal (credit increases, debit decreases)
 *
 * Contra accounts invert their normal side:
 *   - Accumulated Depreciation (ASSET contra) is credit-normal
 *   - Sales Returns (REVENUE contra) is debit-normal
 */
export function getAccountBalanceDelta(
  type: AccountType,
  isContra: boolean,
  debit: number,
  credit: number,
): number {
  const isDebitNormal = (type === 'ASSET' || type === 'EXPENSE') !== isContra
  return isDebitNormal ? debit - credit : credit - debit
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
pnpm --filter @devloggers/api test -- account-normal-side.spec
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/utils/account-normal-side.ts apps/api/src/modules/accounting/accounts/utils/account-normal-side.spec.ts
git commit -m "feat(accounting): isContra-aware getAccountBalanceDelta helper"
```

---

### Task 1.5: TDD `JournalPostingService.post` + `assertLinesPostable`

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/services/journal-posting.service.ts`
- Create: `apps/api/src/modules/accounting/accounts/services/journal-posting.service.spec.ts`

**Interfaces:**
- Consumes: `ReferenceType` from `@devloggers/db-prisma`; `assertFiscalPeriodOpen` from `./assert-period-open` (existing util — re-exported from `accounting/accounts/utils/assert-period-open.ts`).
- Produces: `JournalPostingService.post(tx, input)` returning `{ id }`; `JournalPostingService.reverse(tx, input)` (next task). Both throw `BadRequestException` on validation failure.

- [ ] **Step 1: Write the failing test (post happy path + validation cases)**

`apps/api/src/modules/accounting/accounts/services/journal-posting.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common'
import { JournalPostingService } from './journal-posting.service'
import { ReferenceType } from '@devloggers/db-prisma'

type Tx = any

function makeTx(overrides: Partial<Tx> = {}): Tx {
  return {
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: 'je-1' }),
    },
    chartOfAccount: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'acc-1', code: '1110', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null },
        ]),
    },
    ...overrides,
  } as Tx
}

const baseInput = {
  tenantId: 't1',
  number: 'JE-1',
  date: new Date('2026-07-16'),
  fiscalPeriodId: 'fp-1',
  fiscalPeriodStatus: 'OPEN',
  referenceType: ReferenceType.INVOICE,
  referenceId: 'inv-1',
  description: 'Sale',
  exchangeRate: 1,
  userId: 'u-1',
  lines: [
    { accountId: 'acc-1', debit: 100, credit: 0, description: null, sortOrder: 0 },
    { accountId: 'acc-1', debit: 0, credit: 100, description: null, sortOrder: 1 },
  ],
}

describe('JournalPostingService.post', () => {
  it('creates the journal entry when period OPEN and lines postable + balanced', async () => {
    const tx = makeTx()
    const svc = new JournalPostingService()
    const result = await svc.post(tx, baseInput as any)
    expect(result.id).toBe('je-1')
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1)
  })

  it('throws BadRequestException when fiscal period is not OPEN', async () => {
    const tx = makeTx()
    const svc = new JournalPostingService()
    await expect(svc.post(tx, { ...baseInput, fiscalPeriodStatus: 'CLOSED' } as any))
      .rejects.toBeInstanceOf(BadRequestException)
    expect(tx.journalEntry.create).not.toHaveBeenCalled()
  })

  it('throws when target account is not postable', async () => {
    const tx = makeTx({
      chartOfAccount: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'acc-1', code: '1110', type: 'ASSET', isPostable: false, isContra: false, deletedAt: null }]),
      },
    })
    const svc = new JournalPostingService()
    await expect(svc.post(tx, baseInput as any)).rejects.toBeInstanceOf(BadRequestException)
    expect(tx.journalEntry.create).not.toHaveBeenCalled()
  })

  it('throws when target account is soft-deleted', async () => {
    const tx = makeTx({
      chartOfAccount: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'acc-1', code: '1110', type: 'ASSET', isPostable: true, isContra: false, deletedAt: new Date() },
        ]),
      },
    })
    const svc = new JournalPostingService()
    await expect(svc.post(tx, baseInput as any)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('throws when debit total ≠ credit total', async () => {
    const tx = makeTx()
    const svc = new JournalPostingService()
    await expect(svc.post(tx, {
      ...baseInput,
      lines: [
        { accountId: 'acc-1', debit: 100, credit: 0, description: null, sortOrder: 0 },
        { accountId: 'acc-1', debit: 0, credit: 99, description: null, sortOrder: 1 },
      ],
    } as any)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('throws when lines array is empty', async () => {
    const tx = makeTx()
    const svc = new JournalPostingService()
    await expect(svc.post(tx, { ...baseInput, lines: [] } as any))
      .rejects.toBeInstanceOf(BadRequestException)
  })
})
```

- [ ] **Step 2: Run test (expect fail — module missing)**

```bash
pnpm --filter @devloggers/api test -- journal-posting.service.spec
```

Expected: FAIL ("Cannot find module './journal-posting.service'").

- [ ] **Step 3: Implement `JournalPostingService.post`**

`apps/api/src/modules/accounting/accounts/services/journal-posting.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common'
import { assertFiscalPeriodOpen } from '../utils/assert-period-open'

export interface PostingJournalLine {
  accountId: string
  debit: number
  credit: number
  description: string | null
  sortOrder: number
  partyId?: string | null
}

export interface PostInput {
  tenantId: string
  number: string
  date: Date
  fiscalPeriodId: string
  fiscalPeriodStatus: string
  referenceType: import('@devloggers/db-prisma').ReferenceType
  referenceId: string
  description: string
  exchangeRate: number
  userId: string
  lines: PostingJournalLine[]
}

interface AccountMeta {
  id: string
  code: string
  type: string
  isPostable: boolean
  isContra: boolean
  deletedAt: Date | null
}

const BALANCE_TOLERANCE = 0.0001

@Injectable()
export class JournalPostingService {
  async post(tx: any, input: PostInput): Promise<{ id: string }> {
    assertFiscalPeriodOpen(input.fiscalPeriodStatus)

    if (input.lines.length === 0) {
      throw new BadRequestException('Cannot post a journal entry with no lines')
    }

    const accountIds = Array.from(new Set(input.lines.map((l) => l.accountId)))
    const accounts = await tx.chartOfAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, code: true, type: true, isPostable: true, isContra: true, deletedAt: true },
    })
    const accountMap = new Map<string, AccountMeta>(accounts.map((a) => [a.id, a as AccountMeta]))

    for (const id of accountIds) {
      const acc = accountMap.get(id)
      if (!acc) throw new BadRequestException(`Account "${id}" does not exist`)
      if (acc.deletedAt) throw new BadRequestException(`Account "${acc.code}" is deleted`)
      if (!acc.isPostable) throw new BadRequestException(`Account "${acc.code}" is not postable`)
    }

    const totalDebit = input.lines.reduce((s, l) => s + Number(l.debit), 0)
    const totalCredit = input.lines.reduce((s, l) => s + Number(l.credit), 0)
    if (Math.abs(totalDebit - totalCredit) > BALANCE_TOLERANCE) {
      throw new BadRequestException(
        `Journal entry is not balanced: debit ${totalDebit} ≠ credit ${totalCredit}`,
      )
    }

    const entry = await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        number: input.number,
        date: input.date,
        fiscalPeriodId: input.fiscalPeriodId,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        status: 'POSTED',
        exchangeRate: input.exchangeRate,
        postedAt: new Date(),
        createdBy: input.userId,
        lines: {
          create: input.lines.map((l) => ({
            tenantId: input.tenantId,
            accountId: l.accountId,
            partyId: l.partyId ?? null,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
            sortOrder: l.sortOrder,
          })),
        },
      },
    })

    return { id: entry.id }
  }
}
```

- [ ] **Step 4: Run test (expect pass)**

```bash
pnpm --filter @devloggers/api test -- journal-posting.service.spec
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/services/journal-posting.service.ts apps/api/src/modules/accounting/accounts/services/journal-posting.service.spec.ts
git commit -m "feat(accounting): JournalPostingService.post with strict validation"
```

---

### Task 1.6: TDD `JournalPostingService.reverse` (derive reversal from stored original)

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/services/journal-posting.service.ts`
- Modify: `apps/api/src/modules/accounting/accounts/services/journal-posting.service.spec.ts`

**Interfaces:**
- Consumes: same as `post` plus the stored original JE id.
- Produces: `reverse(tx, input)` returning `{ id }`. Writes `reversalOfId` + `reversalDate`.

- [ ] **Step 1: Add failing tests for `reverse`**

Append to `journal-posting.service.spec.ts`:

```ts
import { ReverseInput } from './journal-posting.service'

describe('JournalPostingService.reverse', () => {
  function makeTxWithOriginal(lines: any[], overrides: Partial<any> = {}): Tx {
    return {
      journalEntry: {
        create: jest.fn().mockResolvedValue({ id: 'je-rev' }),
        findFirst: jest.fn().mockResolvedValue({
          id: 'je-orig', tenantId: 't1', number: 'JE-1', lines,
        }),
      },
      chartOfAccount: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'acc-1', code: '1110', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null }]),
      },
      ...overrides,
    } as Tx
  }

  const baseReverse = {
    tenantId: 't1',
    number: 'JE-2',
    originalEntryId: 'je-orig',
    referenceType: ReferenceType.INVOICE_CANCELLATION,
    referenceId: 'inv-1',
    description: 'Reversal',
    exchangeRate: 1,
    userId: 'u-1',
    reversalDate: new Date('2026-07-16'),
    fiscalPeriodId: 'fp-1',
    fiscalPeriodStatus: 'OPEN',
  }

  it('throws when original entry is missing', async () => {
    const tx = makeTxWithOriginal([], { journalEntry: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() } })
    const svc = new JournalPostingService()
    await expect(svc.reverse(tx, baseReverse as any)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('swaps debit/credit from each original line and posts a reversal with reversalOfId', async () => {
    const tx = makeTxWithOriginal([
      { accountId: 'acc-1', debit: 100, credit: 0, description: 'sale', sortOrder: 0, partyId: 'p1' },
      { accountId: 'acc-1', debit: 0, credit: 100, description: null, sortOrder: 1, partyId: null },
    ])
    const svc = new JournalPostingService()
    const result = await svc.reverse(tx, baseReverse as any)
    expect(result.id).toBe('je-rev')
    const createArg = tx.journalEntry.create.mock.calls[0][0].data
    expect(createArg.reversalOfId).toBe('je-orig')
    expect(createArg.reversalDate).toEqual(baseReverse.reversalDate)
    const lines = createArg.lines.create
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({ accountId: 'acc-1', debit: 0, credit: 100, partyId: 'p1' })
    expect(lines[1]).toMatchObject({ accountId: 'acc-1', debit: 100, credit: 0, partyId: null })
  })

  it('throws when fiscal period is not OPEN', async () => {
    const tx = makeTxWithOriginal([
      { accountId: 'acc-1', debit: 100, credit: 0, description: null, sortOrder: 0 },
      { accountId: 'acc-1', debit: 0, credit: 100, description: null, sortOrder: 1 },
    ])
    const svc = new JournalPostingService()
    await expect(svc.reverse(tx, { ...baseReverse, fiscalPeriodStatus: 'CLOSED' } as any))
      .rejects.toBeInstanceOf(BadRequestException)
  })
})
```

- [ ] **Step 2: Run tests (expect fail — `reverse` undefined)**

```bash
pnpm --filter @devloggers/api test -- journal-posting.service.spec
```

Expected: FAIL on the three new tests; existing 6 pass.

- [ ] **Step 3: Implement `reverse` on the service**

Append to `journal-posting.service.ts`:

```ts
export interface ReverseInput {
  tenantId: string
  number: string
  originalEntryId: string
  referenceType: import('@devloggers/db-prisma').ReferenceType
  referenceId: string
  description: string
  exchangeRate: number
  userId: string
  reversalDate: Date
  fiscalPeriodId: string
  fiscalPeriodStatus: string
}

@Injectable()
export class JournalPostingService {
  async post(tx: any, input: PostInput): Promise<{ id: string }> { /* existing */ }

  async reverse(tx: any, input: ReverseInput): Promise<{ id: string }> {
    assertFiscalPeriodOpen(input.fiscalPeriodStatus)

    const original = await tx.journalEntry.findFirst({
      where: { id: input.originalEntryId, tenantId: input.tenantId, status: 'POSTED' },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!original) {
      throw new BadRequestException('Original journal entry not found')
    }

    const reversedLines: PostingJournalLine[] = original.lines.map((l: any) => ({
      accountId: l.accountId,
      debit: Number(l.credit),
      credit: Number(l.debit),
      description: l.description,
      sortOrder: l.sortOrder,
      partyId: l.partyId ?? null,
    }))

    return this.post(tx, {
      tenantId: input.tenantId,
      number: input.number,
      date: input.reversalDate,
      fiscalPeriodId: input.fiscalPeriodId,
      fiscalPeriodStatus: input.fiscalPeriodStatus,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
      exchangeRate: input.exchangeRate,
      userId: input.userId,
      lines: reversedLines,
    }).then(({ id }) => tx.journalEntry.update({
      where: { id },
      data: { reversalOfId: original.id, reversalDate: input.reversalDate },
    }).then(() => ({ id })))
  }
}
```

> Implementer note: the chained `.then(...)` runs the post first (which creates the entry and validates the lines), then patches the `reversalOfId`/`reversalDate` on the freshly created entry. Both run inside the caller's `$transaction`.

- [ ] **Step 4: Run tests (expect pass)**

```bash
pnpm --filter @devloggers/api test -- journal-posting.service.spec
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/services/journal-posting.service.ts apps/api/src/modules/accounting/accounts/services/journal-posting.service.spec.ts
git commit -m "feat(accounting): JournalPostingService.reverse from stored original"
```

---

### Task 1.7: `assertAccountFitsSlot` helper + tests (Financial Settings slot validation)

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/utils/assert-account-fits-slot.ts`
- Create: `apps/api/src/modules/accounting/accounts/utils/assert-account-fits-slot.spec.ts`

**Interfaces:**
- Consumes: `AccountType`.
- Produces: `assertAccountFitsSlot(account, expectedType, slotName)` throwing `BadRequestException` if the account is deleted, non-postable, inactive, or wrong type. `AccountSlotName` type union listing the nine Financial Settings slots.

- [ ] **Step 1: Write failing test**

```ts
import { BadRequestException } from '@nestjs/common'
import { assertAccountFitsSlot, type AccountSlotName, type AccountSlotExpectation } from './assert-account-fits-slot'

const baseAccount = {
  id: 'a1', code: '1110', type: 'ASSET',
  isPostable: true, isContra: false, deletedAt: null, isActive: true,
}

describe('assertAccountFitsSlot', () => {
  it('passes when type, postable, active, non-deleted all match', () => {
    expect(() => assertAccountFitsSlot(baseAccount, 'ASSET', 'defaultReceivable')).not.toThrow()
  })
  it('throws when type mismatches slot expectation', () => {
    expect(() => assertAccountFitsSlot({ ...baseAccount, type: 'LIABILITY' }, 'ASSET', 'defaultReceivable'))
      .toThrow(BadRequestException)
  })
  it('throws when not postable', () => {
    expect(() => assertAccountFitsSlot({ ...baseAccount, isPostable: false }, 'ASSET', 'defaultReceivable'))
      .toThrow(BadRequestException)
  })
  it('throws when soft-deleted', () => {
    expect(() => assertAccountFitsSlot({ ...baseAccount, deletedAt: new Date() }, 'ASSET', 'defaultReceivable'))
      .toThrow(BadRequestException)
  })
  it('throws when inactive', () => {
    expect(() => assertAccountFitsSlot({ ...baseAccount, isActive: false }, 'ASSET', 'defaultReceivable'))
      .toThrow(BadRequestException)
  })
  it('throws when account is null (not configured)', () => {
    expect(() => assertAccountFitsSlot(null, 'ASSET', 'defaultReceivable')).toThrow(BadRequestException)
  })
})

describe('SLOT_EXPECTATIONS table', () => {
  it('maps every slot name to an expected type', () => {
    expect(SLOT_EXPECTATIONS.defaultSales).toBe('REVENUE')
    expect(SLOT_EXPECTATIONS.defaultPurchase).toBe('EXPENSE')
    expect(SLOT_EXPECTATIONS.defaultTax).toBe('LIABILITY')
    expect(SLOT_EXPECTATIONS.defaultReceivable).toBe('ASSET')
    expect(SLOT_EXPECTATIONS.defaultPayable).toBe('LIABILITY')
    expect(SLOT_EXPECTATIONS.defaultInventory).toBe('ASSET')
    expect(SLOT_EXPECTATIONS.defaultCogs).toBe('EXPENSE')
    expect(SLOT_EXPECTATIONS.defaultInventoryAdjustment).toBe('EXPENSE')
    expect(SLOT_EXPECTATIONS.defaultOpeningEquity).toBe('EQUITY')
  })
})
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm --filter @devloggers/api test -- assert-account-fits-slot.spec
```

Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implement**

`assert-account-fits-slot.ts`:

```ts
import { BadRequestException } from '@nestjs/common'
import type { AccountType } from '@devloggers/db-prisma'

export type AccountSlotName =
  | 'defaultSales'
  | 'defaultPurchase'
  | 'defaultTax'
  | 'defaultReceivable'
  | 'defaultPayable'
  | 'defaultInventory'
  | 'defaultCogs'
  | 'defaultInventoryAdjustment'
  | 'defaultOpeningEquity'

export const SLOT_EXPECTATIONS: Record<AccountSlotName, AccountType> = {
  defaultSales: 'REVENUE',
  defaultPurchase: 'EXPENSE',
  defaultTax: 'LIABILITY',
  defaultReceivable: 'ASSET',
  defaultPayable: 'LIABILITY',
  defaultInventory: 'ASSET',
  defaultCogs: 'EXPENSE',
  defaultInventoryAdjustment: 'EXPENSE',
  defaultOpeningEquity: 'EQUITY',
}

export interface AccountSlotCheck {
  id: string
  code: string
  type: AccountType
  isPostable: boolean
  isContra: boolean
  deletedAt: Date | null
  isActive: boolean
}

export function assertAccountFitsSlot(
  account: AccountSlotCheck | null,
  expectedType: AccountType,
  slotName: AccountSlotName,
): void {
  if (!account) {
    throw new BadRequestException(`No account configured for slot "${slotName}"`)
  }
  if (account.deletedAt) {
    throw new BadRequestException(`Account "${account.code}" is deleted (slot "${slotName}")`)
  }
  if (!account.isPostable) {
    throw new BadRequestException(`Account "${account.code}" is not postable (slot "${slotName}")`)
  }
  if (!account.isActive) {
    throw new BadRequestException(`Account "${account.code}" is inactive (slot "${slotName}")`)
  }
  if (account.type !== expectedType) {
    throw new BadRequestException(
      `Account "${account.code}" is not a valid ${slotName} (must be ${expectedType}, got ${account.type})`,
    )
  }
}
```

Don't forget to add the `import { SLOT_EXPECTATIONS }` line in the spec — implementer, prepend:
```ts
import { SLOT_EXPECTATIONS } from './assert-account-fits-slot'
```

- [ ] **Step 4: Run test (expect pass)**

```bash
pnpm --filter @devloggers/api test -- assert-account-fits-slot.spec
```

Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/utils/assert-account-fits-slot.ts apps/api/src/modules/accounting/accounts/utils/assert-account-fits-slot.spec.ts
git commit -m "feat(accounting): assertAccountFitsSlot + SLOT_EXPECTATIONS"
```

---

### Task 1.8: Wire `JournalPostingService` into `AccountsModule`; delete old utils `create-posting-journal-entry.ts` and `updateAccountBalances`

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/accounts.module.ts`
- Delete: `apps/api/src/modules/accounting/accounts/utils/create-posting-journal-entry.ts`
- Modify: `apps/api/src/modules/accounting/accounts/utils/account-balance.utils.ts` (delete `updateAccountBalances`; move/drop `getAccountBalanceDelta` — already superseded by `account-normal-side.ts` in Task 1.4)

**Interfaces:**
- Consumes: `JournalPostingService`, `AccountPresenter`, `AccountsRepository`.
- Produces: `AccountsModule` exports `JournalPostingService` for `InvoicingModule`/`PaymentsModule`/`ExpensesModule`/`InventoryModule` consumers.

- [ ] **Step 1: Update the module**

`apps/api/src/modules/accounting/accounts/accounts.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { LocaleResolverService } from '@devloggers/backend-core'
import { AccountsRepository } from './repositories/accounts.repository'
import { AccountsService } from './services/accounts.service'
import { AccountPresenter } from './presenters/account.presenter'
import { AccountsController } from './controllers/accounts.controller'
import { AccountBalancesController } from './controllers/account-balances.controller'
import { AccountBalancesService } from './services/account-balances.service'
import { JournalPostingService } from './services/journal-posting.service'

@Module({
    controllers: [AccountsController, AccountBalancesController],
    providers: [AccountsRepository, AccountsService, AccountPresenter, AccountBalancesService, JournalPostingService, LocaleResolverService],
    exports: [AccountsService, JournalPostingService],
})
export class AccountsModule {}
```

- [ ] **Step 2: Delete the obsolete file**

```bash
git rm apps/api/src/modules/accounting/accounts/utils/create-posting-journal-entry.ts
```

- [ ] **Step 3: Trim `account-balance.utils.ts`**

Delete its body entirely (both `updateAccountBalances` and `getAccountBalanceDelta` are now superseded). Leave a single re-export shim so any lingering import doesn't break the build until Phase 2 sweep:

```ts
export { getAccountBalanceDelta } from './account-normal-side'
```

Wait — `getAccountBalanceDelta` in `account-normal-side.ts` has the new `isContra` param; the old call sites will fail the typecheck. Since Phase 2 will rewrite every call site anyway, and project dev allows build breakage mid-refactor, prefer deleting the shim entirely:

```bash
git rm apps/api/src/modules/accounting/accounts/utils/account-balance.utils.ts
```

- [ ] **Step 4: Verify the build is red but only in places Phase 2 will fix**

```bash
pnpm --filter @devloggers/api lint
```

> Expect lint failures in callers that still import the deleted utils. Do NOT commit a green build yet — the full sweep is Phase 2. This gate is "did we clean the local accounting module files?".

Run (forget-the-red-builds check):

```bash
pnpm --filter @devloggers/api test -- account-normal-side.spec journal-posting.service.spec assert-account-fits-slot.spec roll-up-balances.spec
```

Expected: all four new / preserved spec files PASS. (Other tests that touch removed utils will fail — those are Phase 2.)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts
git commit -m "feat(accounting): wire JournalPostingService into AccountsModule; delete obsolete posting utils"
```

---

## Phase 2 — Consumer sweep (every posting flow to the facade)

> Each task in this phase follows the same pattern: read the consumer, translate its old `createPostingJournalEntry(tx, ...)` call to `journalPosting.post(tx, ...)` (or `.reverse(...)` for cancellations), add fiscal-period fetch where missing, run the consumer's existing spec + add a new one for the gap closure, commit. Phase 2 ends with a full-green `pnpm --filter @devloggers/api test` and a grep proving no `tx.journalEntry.create` exists outside `journal-posting.service.ts`.

### Task 2.1: Invoices — `postPurchaseInvoice` to facade

**Files:**
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts:1-116`
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.spec.ts`

**Interfaces:**
- Consumes: `JournalPostingService`, `ReferenceType`, `assertAccountFitsSlot`, `SLOT_EXPECTATIONS`, `AccountsRepository.findMany` to resolve accounts for slot validation.
- Produces: purchase invoice posts through the facade; existing test suite green.

- [ ] **Step 1: Inject `JournalPostingService` into `InvoicePostingService` constructor**

Add `private readonly journalPosting: JournalPostingService` to the constructor params (`invoice-posting.service.ts:14-19`). Add the import.

- [ ] **Step 2: Replace the `createPostingJournalEntry(tx, {...})` call in `postPurchaseInvoice` (line 97-108)**

Replace with:

```ts
await this.journalPosting.post(tx, {
  tenantId,
  number: jeNumber,
  date: invoice.date,
  fiscalPeriodId: invoice.fiscalPeriodId,
  fiscalPeriodStatus: invoice.fiscalPeriod?.status,
  referenceType: ReferenceType.INVOICE,
  referenceId: invoice.id,
  description: `Purchase invoice ${invoice.number}`,
  exchangeRate,
  userId,
  lines: journalLines,
})
```

Drop the import of `createPostingJournalEntry`. Keep `assertFiscalPeriodOpen` for defense-in-depth (facade re-validates).

- [ ] **Step 3: Update the spec mock**

In `invoice-posting.service.spec.ts`, replace `tx.journalEntry.create` mocks with `journalPosting.post` mocks. Example pattern:

```ts
const journalPosting = { post: jest.fn().mockResolvedValue({ id: 'je-1' }), reverse: jest.fn().mockResolvedValue({ id: 'je-r' }) }
// pass into the InvoicePostingService constructor
```

Adjust assertions that read `tx.journalEntry.create.mock.calls[0][0].data.lines.create` to read `journalPosting.post.mock.calls[0][0].lines`.

- [ ] **Step 4: Run the spec**

```bash
pnpm --filter @devloggers/api test -- invoice-posting.service.spec
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts apps/api/src/modules/invoicing/invoices/invoice-posting.service.spec.ts
git commit -m "feat(invoices): postPurchaseInvoice via JournalPostingService facade"
```

---

### Task 2.2: Invoices — `postSalesInvoice` (incl. COGS lines) to facade

**Files:**
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts:118-225`
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.perpetual.spec.ts`

**Interfaces:** same as 2.1.

- [ ] **Step 1: Replace `createPostingJournalEntry(tx, {...})` at line 206-217 with `journalPosting.post(tx, {...})`** mirroring 2.1 (referenceType `ReferenceType.INVOICE`, `fiscalPeriodStatus` from `invoice.fiscalPeriod?.status`). The combined `[...revenueLines, ...cogsLines]` array is passed through unchanged — facade validates balance once.

- [ ] **Step 2: Update `invoice-posting.perpetual.spec.ts` mocks**

Same pattern: replace `tx.journalEntry.create` with `journalPosting.post`.

- [ ] **Step 3: Run specs**

```bash
pnpm --filter @devloggers/api test -- invoice-posting
```

Expected: both spec files PASS.

- [ ] **Step 4: Grep verification — purchase + sales both through facade**

Run:
```bash
rg -n "createPostingJournalEntry" apps/api/src/modules/invoicing
```
Expected: only `invoice-posting.service.ts`'s import line is gone; no matches in the invoices directory besides the cancellation block (handled in Task 2.3) and any comment references.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts apps/api/src/modules/invoicing/invoices/invoice-posting.perpetual.spec.ts
git commit -m "feat(invoices): postSalesInvoice (incl COGS) via facade"
```

---

### Task 2.3: Invoices — `cancelInvoice` to `journalPosting.reverse` (reversal date = original invoice date)

**Files:**
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts:227-308`
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.spec.ts`

**Interfaces:** consumes `JournalPostingService.reverse`.

- [ ] **Step 1: Remove the manual swap (lines 256-263) and the `createPostingJournalEntry` call at line 289-300**

Replace the `createPostingJournalEntry(tx, {...})` block with:

```ts
await this.journalPosting.reverse(tx, {
  tenantId,
  number: jeNumber,
  originalEntryId: original.id,
  referenceType: ReferenceType.INVOICE_CANCELLATION,
  referenceId: invoice.id,
  description: `Reversal of invoice ${invoice.number}`,
  exchangeRate,
  userId,
  reversalDate: invoice.date,        // ← original invoice date, not new Date()
  fiscalPeriodId: invoice.fiscalPeriodId,
  fiscalPeriodStatus: invoice.fiscalPeriod?.status,
})
```

Keep the stock-movement reversal loop (lines 270-287) unchanged.

- [ ] **Step 2: Update the spec to expect `journalPosting.reverse`**

Adjust the existing cancellation test to assert `journalPosting.reverse.mock.calls[0][0]` carries `originalEntryId: original.id` and `reversalDate: invoice.date`.

- [ ] **Step 3: Run specs**

```bash
pnpm --filter @devloggers/api test -- invoice-posting.service.spec
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts apps/api/src/modules/invoicing/invoices/invoice-posting.service.spec.ts
git commit -m "feat(invoices): cancelInvoice via journalPosting.reverse; reversalDate=invoice.date"
```

---

### Task 2.4: Payments — `post` to facade (closes fiscal-period gap)

**Files:**
- Modify: `apps/api/src/modules/invoicing/payments/payments.service.ts:1-168`
- Modify: `apps/api/src/modules/invoicing/payments/payments.service.spec.ts` (create if missing)

**Interfaces:** consumes `JournalPostingService`, `ReferenceType`.

- [ ] **Step 1: Add `JournalPostingService` to constructor (`PaymentsService`)**

Add `private readonly journalPosting: JournalPostingService` and the import.

- [ ] **Step 2: In `findById` (line 41), include `fiscalPeriod: { select: { status: true } }`**

So the post + cancel flows can pass `fiscalPeriodStatus` to the facade. (Closes the audit gap.)

- [ ] **Step 3: Replace `createPostingJournalEntry(tx, {...})` at line 143-154 with `journalPosting.post`**

Reference type `ReferenceType.PAYMENT`, `fiscalPeriodStatus: payment.fiscalPeriod?.status`. (If `payment.fiscalPeriod` is sometimes null, fetch synchronously in the post method.)

- [ ] **Step 4: Create / update the spec**

Add a test asserting `journalPosting.post` was called and that `payment.fiscalPeriod.status` was passed.

- [ ] **Step 5: Run + commit**

```bash
pnpm --filter @devloggers/api test -- payments.service.spec
git add apps/api/src/modules/invoicing/payments
git commit -m "feat(payments): post via JournalPostingService; add fiscal-period guard"
```

---

### Task 2.5: Payments — `cancel` via `journalPosting.reverse`

**Files:**
- Modify: `apps/api/src/modules/invoicing/payments/payments.service.ts:170-233`

- [ ] **Step 1: Fetch the original JE before calling reverse**

After the existing `findById` (which now includes `fiscalPeriod: { select: { status: true } }`), add:

```ts
const original = await this.prisma.journalEntry.findFirst({
  where: { tenantId, referenceType: ReferenceType.PAYMENT, referenceId: payment.id, status: 'POSTED' },
})
if (!original) throw new BadRequestException('Original journal entry not found for this payment.')
```

- [ ] **Step 2: Replace `buildPaymentJournalLines(...,{reverse:true})` + `createPostingJournalEntry(tx, {...})` (lines 193-219) with `journalPosting.reverse`**

```ts
await this.journalPosting.reverse(tx, {
  tenantId,
  number: jeNumber,
  originalEntryId: original.id,
  referenceType: ReferenceType.PAYMENT_CANCELLATION,
  referenceId: payment.id,
  description: `Reversal of payment ${payment.number}`,
  exchangeRate,
  userId,
  reversalDate: payment.date,
  fiscalPeriodId: payment.fiscalPeriodId,
  fiscalPeriodStatus: payment.fiscalPeriod?.status,
})
```

Cashbox balance increment (line 221-224) stays.

- [ ] **Step 3: Drop the `reverse` flag from `buildPaymentJournalLines`**

In `apps/api/src/modules/invoicing/payments/payment-journal.ts:30-56`, remove `opts: { reverse?: boolean }` and the `rev` logic; always return the forward direction. (Now dead code.)

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @devloggers/api test -- payments.service.spec payment-journal
git add apps/api/src/modules/invoicing/payments
git commit -m "feat(payments): cancel via journalPosting.reverse; drop reverse flag from builder"
```

---

### Task 2.6: Expenses — `post` to facade (closes fiscal-period gap + adds per-item account validation)

**Files:**
- Modify: `apps/api/src/modules/invoicing/expenses/expenses.service.ts:1-206`
- Modify: `apps/api/src/modules/invoicing/expenses/expense-journal.ts:27-50` (drop `reverse` flag — dead after sweep)
- Create or modify: `apps/api/src/modules/invoicing/expenses/expenses.service.spec.ts` (if absent, follow the invoice spec pattern)

- [ ] **Step 1: Inject `JournalPostingService` + `AccountsRepository` (for the per-item slot check)**

Add the imports + constructor params.

- [ ] **Step 2: Add `include: { fiscalPeriod: { select: { status: true } } }` to the expense fetch in `post` and `cancel`**

So the facade can validate period-open. (Closes the gap.)

- [ ] **Step 3: Validate each `ExpenseItem.accountId` is EXPENSE-type postable leaf; `cashbox.linkedAccountId` is ASSET-type**

Before the journal write, batch-fetch the accounts:

```ts
const accountIds = Array.from(new Set([
  ...expense.items.map(i => i.accountId),
  expense.cashbox.linkedAccountId,
]))
const accounts = await this.prisma.chartOfAccount.findMany({
  where: { id: { in: accountIds }, tenantId },
  select: { id: true, code: true, type: true, isPostable: true, isContra: true, deletedAt: true, isActive: true },
})
const byId = new Map(accounts.map(a => [a.id, a]))
for (const item of expense.items) {
  assertAccountFitsSlot(byId.get(item.accountId) ?? null, 'EXPENSE', 'defaultPurchase')
}
assertAccountFitsSlot(byId.get(expense.cashbox.linkedAccountId) ?? null, 'ASSET', 'defaultReceivable')
```

- [ ] **Step 4: Replace `createPostingJournalEntry(tx, {...})` at line 128 with `journalPosting.post`** (referenceType `ReferenceType.EXPENSE`, `fiscalPeriodStatus` from `expense.fiscalPeriod?.status`).

- [ ] **Step 5: `cancel` — fetch original JE, call `journalPosting.reverse` with `reversalDate: expense.date`, `referenceType: ReferenceType.EXPENSE_CANCELLATION`.**

- [ ] **Step 6: Drop `reverse` flag from `buildExpenseJournalLines`** in `expense-journal.ts:27-50`.

- [ ] **Step 7: Run specs + commit**

```bash
pnpm --filter @devloggers/api test -- expenses
git add apps/api/src/modules/invoicing/expenses
git commit -m "feat(expenses): post/cancel via facade; close fiscal-period + account-type validation gaps"
```

---

### Task 2.7: Stock-count post → facade

**Files:**
- Modify: `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts:138`

- [ ] **Step 1: Inject `JournalPostingService` into `StockCountsService`.**

- [ ] **Step 2: Replace `createPostingJournalEntry(tx, {...})` at line 138 with `journalPosting.post`** (referenceType `ReferenceType.STOCK_COUNT`, `fiscalPeriodStatus: (stockCount as any).fiscalPeriod?.status`). The stock-movement post loop above stays unchanged.

- [ ] **Step 3: Run existing stock-counts spec + commit**

```bash
pnpm --filter @devloggers/api test -- stock-counts
git add apps/api/src/modules/inventory/stock-counts
git commit -m "feat(stock-counts): post via facade"
```

---

### Task 2.8: Opening-balance post → facade

**Files:**
- Modify: `apps/api/src/modules/inventory/inventory.service.ts:1-161`

- [ ] **Step 1: Inject `JournalPostingService` into `InventoryService`.**

- [ ] **Step 2: Replace `createPostingJournalEntry(tx, {...})` at line 140 with `journalPosting.post`** (referenceType `ReferenceType.OPENING_BALANCE`, `fiscalPeriodStatus: dto.fiscalPeriodStatus` — fetch if absent).

- [ ] **Step 3: Update specs + commit**

```bash
pnpm --filter @devloggers/api test -- inventory
git add apps/api/src/modules/inventory
git commit -m "feat(inventory): registerOpeningBalance via facade"
```

---

### Task 2.9: `ReferenceType` enum sweep — replace every bare string literal

**Files:**
- Modify: every file listing in the audit call-site table (`apps/api/src/modules/invoicing/**`, `apps/api/src/modules/inventory/**`).

- [ ] **Step 1: Grep for bare strings**

```bash
rg -n "'invoice'|'invoice_cancellation'|'payment'|'payment_cancellation'|'expense'|'expense_cancellation'|'opening_balance'|'stock_count'" apps/api/src
```

- [ ] **Step 2: Replace each match with the corresponding `ReferenceType.XXX` constant** in its containing file. Where the literal is fed into a `where: { referenceType: ... }` Prisma query (e.g. invoice-posting.service.ts:250's `findFirst` for the original JE, payments cancel's new `findFirst`), import `ReferenceType` and use the enum value.

> Stock-movement `referenceType` (column on `StockMovement`, separate from `JournalEntry.referenceType`) is a separate string column — **leave those alone**. This sweep targets only the GL `referenceType`. Disambiguate by checking the model the literal is bound to before editing.

- [ ] **Step 3: Confirm no bare GL referenceType strings remain**

```bash
rg -n "'invoice'|'payment'|'expense'|'opening_balance'|'stock_count'" apps/api/src/modules/invoicing apps/api/src/modules/inventory
```

Expected: only `StockMovement`-bound strings (e.g. `referenceType: 'invoice'` inside `postMovementTx` calls) — those are intentionally strings. Cross-check each remaining match against the file:line context.

- [ ] **Step 4: Run full test suite**

```bash
pnpm --filter @devloggers/api test
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src
git commit -m "refactor(accounting): replace bare GL referenceType strings with ReferenceType enum"
```

---

### Task 2.10: Financial Settings — wire `assertAccountFitsSlot` into `upsert`

**Files:**
- Modify: `apps/api/src/modules/accounting/financial-settings/services/financial-settings.service.ts`
- Create: `apps/api/src/modules/accounting/financial-settings/services/financial-settings.service.spec.ts` (or extend existing)

- [ ] **Step 1: In `upsert`, after collecting the incoming ids, batch-fetch each referenced account**

```ts
const slotIdsBySlot = {
  defaultSales: data.defaultSalesAccountId,
  defaultPurchase: data.defaultPurchaseAccountId,
  defaultTax: data.defaultTaxAccountId,
  defaultReceivable: data.defaultReceivableAccountId,
  defaultPayable: data.defaultPayableAccountId,
  defaultInventory: data.defaultInventoryAccountId,
  defaultCogs: data.defaultCogsAccountId,
  defaultInventoryAdjustment: data.defaultInventoryAdjustmentAccountId,
  defaultOpeningEquity: data.defaultOpeningEquityAccountId,
}
const ids = Object.values(slotIdsBySlot).filter(Boolean) as string[]
const accounts = ids.length ? await this.prisma.chartOfAccount.findMany({
  where: { id: { in: ids }, tenantId },
  select: { id: true, code: true, type: true, isPostable: true, isContra: true, deletedAt: true, isActive: true },
}) : []
const byId = new Map(accounts.map(a => [a.id, a]))
;(Object.keys(slotIdsBySlot) as AccountSlotName[]).forEach((slot) => {
  const id = slotIdsBySlot[slot]
  if (id) assertAccountFitsSlot(byId.get(id) ?? null, SLOT_EXPECTATIONS[slot], slot)
})
```

- [ ] **Step 2: Write tests covering valid + invalid per slot (matrix)**. At minimum: a passing case (all slots valid), a rejection case (one slot has wrong type), a rejection case (one slot references a non-postable account).

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @devloggers/api test -- financial-settings
git add apps/api/src/modules/accounting/financial-settings
git commit -m "feat(financial-settings): assertAccountFitsSlot on every GL slot"
```

---

### Task 2.11: Onboarding — set `isPostable=false` on parents; `1220` contra; add `5210` adjustment leaf; backfill the 4 GL-default slots

**Files:**
- Modify: `apps/api/src/modules/identity/onboarding/services/onboarding.service.ts:129-252`
- Modify: `apps/api/src/modules/identity/onboarding/onboarding.service.spec.ts` (if present)

- [ ] **Step 1: Update `bootstrapChartOfAccounts` create calls**

For level-1 + level-2 entries (`lines 148-191`), add `isPostable: false` to each `data` payload. Level-3 entries keep the default (true).

For `1220` Accumulated Depreciation (line 226), add `isContra: true` to its `data` payload in the level-3 loop.

- [ ] **Step 2: Add `5210 Inventory Adjustments` to the template (`getCoaTemplate`, line 240-241)**

```ts
{ code: '5210', nameAr: 'تسويات المخزون', nameEn: 'Inventory Adjustments', type: AccountType.EXPENSE, parentCode: '5000' },
```

Place it next to `5100` COGS under the "Cost of Sales" group.

- [ ] **Step 3: Backfill `stepGlDefaults` (lines 87-99)**

Extend the `update` payload:

```ts
defaultInventoryAccountId: ids['1130'],
defaultCogsAccountId: ids['5100'],
defaultInventoryAdjustmentAccountId: ids['5210'],
defaultOpeningEquityAccountId: ids['3100'],
```

- [ ] **Step 4: Run onboarding spec + db seed**

```bash
pnpm --filter @devloggers/api test -- onboarding
pnpm --filter @devloggers/db-prisma db:reset
pnpm --filter @devloggers/db-prisma db:seed
```

Expected: seed completes; verify in db studio (optional) that the seeded parents have `is_postable=false` and `1220` has `is_contra=true`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/onboarding
git commit -m "feat(onboarding): parent accounts non-postable; 1220 contra; backfill 4 inventory GL slots"
```

---

### Task 2.12: Soft delete in `AccountsService` + restore endpoint

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/services/accounts.service.ts` (override `delete`)
- Modify: `apps/api/src/modules/accounting/accounts/controllers/accounts.controller.ts` (add `restore`)
- Modify: `apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts` (add `archive`, `restore`, `countJournalLines`)

- [ ] **Step 1: Add repo helpers**

```ts
async countJournalLines(tenantId: string, id: string): Promise<number> {
  return this.prisma.journalLine.count({ where: { tenantId, accountId: id } })
}
async archive(tenantId: string, id: string): Promise<void> {
  await this.prisma.chartOfAccount.update({ where: { id }, data: { deletedAt: new Date(), isPostable: false } })
}
async restore(tenantId: string, id: string): Promise<void> {
  await this.prisma.chartOfAccount.update({ where: { id }, data: { deletedAt: null } })
}
```

Also override `findMany` / `findById` / `findAllForBalances` / the existing `countLedgerLines` to filter `deletedAt: null` by default. (Easiest: add `deletedAt: null` to every chart-of-account query's `where`.)

- [ ] **Step 2: Override `AccountsService.delete(tenantId, id)`**

```ts
async delete(tenantId: string, id: string) {
  const lineCount = await this.accountsRepository.countJournalLines(tenantId, id)
  if (lineCount > 0) {
    throw new ConflictException('Cannot archive an account that has journal entries. Re-assign its lines to another account first.')
  }
  await this.accountsRepository.archive(tenantId, id)
}
```

Callers using `CrudService.delete` (the factory) inherit this override.

- [ ] **Step 3: Add a `restore` endpoint on `AccountsController`**

```ts
@Patch(':id/restore')
@ApiOperation({ summary: 'Restore an archived account', description: 'Nulls deletedAt. The account becomes visible again.' })
@ApiStandardErrors()
async restore(@CurrentUser() user: RequestUser, @Param('id') id: string) {
  await this.accountsService.restore(user.tenantId, id)
  return ApiResponseBuilder.success(null, 'Account restored')
}
```

Add `async restore(tenantId, id) { await this.accountsRepository.restore(tenantId, id) }` to the service.

- [ ] **Step 4: Add `convert-to-group` endpoint**

```ts
@Post(':id/convert-to-group')
async convertToGroup(@CurrentUser() user: RequestUser, @Param('id') id: string) {
  await this.accountsService.convertToGroup(user.tenantId, id)
  return ApiResponseBuilder.success(null, 'Account converted to group')
}
```

Service method:

```ts
async convertToGroup(tenantId: string, id: string) {
  const lineCount = await this.accountsRepository.countJournalLines(tenantId, id)
  if (lineCount > 0) {
    throw new ConflictException('Cannot convert an account that has journal entries to a group account. Re-assign its lines first.')
  }
  await this.prisma.chartOfAccount.update({ where: { id }, data: { isPostable: false } })
}
```

- [ ] **Step 5: Specs + commit**

```bash
pnpm --filter @devloggers/api test -- accounts
git add apps/api/src/modules/accounting/accounts
git commit -m "feat(accounts): soft delete with beforeJournal-lines guard; restore + convert-to-group endpoints"
```

---

### Task 2.13: Phase 2 final gate — full test green + zero stray `tx.journalEntry.create`

- [ ] **Step 1: Full test run**

```bash
pnpm --filter @devloggers/api test
```

Expected: all tests green.

- [ ] **Step 2: Grep — no raw `journalEntry.create` outside the facade**

```bash
rg -n "tx\.journalEntry\.create|prisma\.journalEntry\.create" apps/api/src
```

Expected: only matches inside `journal-posting.service.ts` (the facade). Anything else → still calling the old helper; fix it.

- [ ] **Step 3: Lint + typecheck + commit (if any residual touch-ups)**

```bash
pnpm --filter @devloggers/api lint
pnpm turbo run build --filter=@devloggers/api
pnpm generate
```

- [ ] **Step 4: Tag commit**

```bash
git commit --allow-empty -m "chore(accounting): Phase 2 gate green"
```

---

## Phase 3 — Lazy balances API + dashboard

### Task 3.1: Api-contracts — new routes + DTOs (`AccountBalanceSummaryDto`, `AccountChildrenBalancesResponseDto`)

**Files:**
- Modify: `packages/api-contracts/src/resources/account.resource.ts`
- Modify: `apps/api/src/modules/accounting/accounts/dto/account-balance.dto.ts` (rewrite)
- Modify: `apps/api/src/modules/accounting/accounts/dto/account.dto.ts` (extend Tree/Response DTOs)

- [ ] **Step 1: Update `account.resource.ts`**

```ts
export const accountResource = defineCrudResource({
  key: 'chart-of-accounts',
  routes: {
    list: '/accounting/chart-of-accounts',
    show: '/accounting/chart-of-accounts/{id}',
    create: '/accounting/chart-of-accounts',
    update: '/accounting/chart-of-accounts/{id}',
    delete: '/accounting/chart-of-accounts/{id}',
    tree: '/accounting/chart-of-accounts/tree',
    balance: '/accounting/chart-of-accounts/{id}/balance',
    childrenBalances: '/accounting/chart-of-accounts/children-balances',
    ledger: '/accounting/chart-of-accounts/{id}/ledger',
  },
})
```

- [ ] **Step 2: Replace `AccountBalanceDto` with `AccountBalanceSummaryDto` (add `isPostable`, `isContra`, `parentCode`, `parentName`, `childrenCount`)**

`apps/api/src/modules/accounting/accounts/dto/account-balance.dto.ts` (rewritten, drop `AccountBalanceDto`):

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { LocalizedStringDto } from '@devloggers/backend-core'
import { AccountTypeEnum } from './account.dto'
import { transform } from 'class-transformer'

export class AccountBalanceSummaryDto {
  @ApiProperty() id = ''
  @ApiProperty() code = ''
  @ApiProperty() name = ''
  @ApiProperty({ type: LocalizedStringDto }) nameI18n: LocalizedStringDto = new LocalizedStringDto()
  @ApiProperty({ enum: AccountTypeEnum, enumName: 'AccountTypeEnum' }) type: AccountTypeEnum = AccountTypeEnum.ASSET
  @ApiProperty() isPostable = true
  @ApiProperty() isContra = false
  @ApiProperty() isActive = true
  @ApiPropertyOptional({ nullable: true }) parentId: string | null = null
  @ApiPropertyOptional({ nullable: true }) parentCode: string | null = null
  @ApiPropertyOptional({ nullable: true }) parentName: string | null = null
  @ApiProperty() ownBalance = 0
  @ApiProperty() rolledBalance = 0
  @ApiProperty() childrenCount = 0
}

export class AccountChildrenBalancesResponseDto {
  @ApiProperty({ type: AccountBalanceSummaryDto, isArray: true }) items: AccountBalanceSummaryDto[] = []
  @ApiPropertyOptional({ type: AccountBalanceSummaryDto, nullable: true }) parent: AccountBalanceSummaryDto | null = null
}
```

- [ ] **Step 3: Extend `ChartOfAccountTreeDto` and `ChartOfAccountResponseDto` with `isPostable`, `isContra`, `deletedAt` (Response only)**

In `account.dto.ts`, add `@ApiProperty() isPostable: boolean` and `isContra: boolean` to both, and `deletedAt: string | null` to `ChartOfAccountResponseDto`.

- [ ] **Step 4: Build + commit**

```bash
pnpm turbo run build --filter=@devloggers/api-contracts
git add packages/api-contracts/src/resources/account.resource.ts apps/api/src/modules/accounting/accounts/dto
git commit -m "feat(api-contracts): AccountBalanceSummaryDto + lazy balance routes"
```

---

### Task 3.2: Repository — `findBalanceForAccount`, `findChildrenBalanceSummaries`, `computeRolledBalance`

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/repositories/accounts.repository.ts`
- Modify: `apps/api/src/modules/accounting/accounts/repositories/accounts.repository.spec.ts`

- [ ] **Step 1: Add helper `subtreeAccountIds(tenantId, rootId)`** — recursive walk up to a (sane) depth cap or via repeated `findMany where parentId IN (current level)` until no new ids; collect all descendant account ids.

```ts
async subtreeAccountIds(tenantId: string, rootId: string): Promise<string[]> {
  const visited = new Set<string>([rootId])
  let frontier = [rootId]
  while (frontier.length) {
    const next = await this.prisma.chartOfAccount.findMany({
      where: { tenantId, parentId: { in: frontier }, deletedAt: null },
      select: { id: true },
    })
    const newIds = next.map(n => n.id).filter(id => !visited.has(id))
    newIds.forEach(id => visited.add(id))
    frontier = newIds
  }
  return Array.from(visited)
}
```

- [ ] **Step 2: Add `sumLinesForAccounts(tenantId, accountIds)`**

```ts
async sumLinesForAccounts(tenantId: string, accountIds: string[]) {
  if (accountIds.length === 0) return []
  return this.prisma.journalLine.groupBy({
    by: ['accountId'],
    where: { tenantId, accountId: { in: accountIds }, journalEntry: { status: 'POSTED' } },
    _sum: { debit: true, credit: true },
  })
}
```

- [ ] **Step 3: Add `findBalanceForAccount`, `findChildrenBalanceSummaries`** — fetch account(s), subtree, sums, run `rollUpBalances`. Return shape matching the DTO (with `parentCode`/`parentName` joined where applicable).

(Signature details in the spec Section 3.)

- [ ] **Step 4: Specs**

Write `accounts.repository.spec.ts` coverage for: single-account balance + subtree rollup, children-of root includes only roots, children-of a real parent includes only direct children with subtree rollups.

- [ ] **Step 5: Run + commit**

```bash
pnpm --filter @devloggers/api test -- accounts.repository.spec
git add apps/api/src/modules/accounting/accounts/repositories
git commit -m "feat(accounts): repository methods for lazy balance reads"
```

---

### Task 3.3: Service + Controller — new balance endpoints

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/services/account-balances.service.ts` (drop `getBalances`; add `getBalance`, `getChildrenBalances`)
- Modify: `apps/api/src/modules/accounting/accounts/controllers/account-balances.controller.ts` (retire; move routes onto `AccountsController`)
- Modify: `apps/api/src/modules/accounting/accounts/controllers/accounts.controller.ts` (add `balance`, `childrenBalances`, ledger route move)

- [ ] **Step 1: In `AccountBalancesService`, delete `getBalances` body** and add:

```ts
async getBalance(tenantId: string, id: string): Promise<AccountBalanceSummaryDto> { /* use repo.findBalanceForAccount */ }
async getChildrenBalances(tenantId: string, parentId: string | null): Promise<{ items, parent }> { /* use repo.findChildrenBalanceSummaries */ }
```

Map ledger hook to new route (mechanical) — keep `getLedger` in this service.

- [ ] **Step 2: Move routes onto `AccountsController`**

```ts
@Get(':id/balance')
async balance(@CurrentUser() user, @Param('id') id: string) {
  return ApiResponseBuilder.success(await this.accountsService.getBalance(user.tenantId, id), 'Account balance')
}

@Get('children-balances')
async childrenBalances(@CurrentUser() user, @Query('parentId') parentId?: string) {
  const parent = parentId && parentId !== 'ROOT' ? parentId : null
  return ApiResponseBuilder.success(await this.accountsService.getChildrenBalances(user.tenantId, parent), 'Children balances')
}

@Get(':id/ledger')
async ledger(@CurrentUser() user, @Param('id') id, @Query('page') page?, @Query('limit') limit?) {
  const result = await this.accountsService.getLedger(user.tenantId, id, Number(page) || 1, Number(limit) || 50)
  return ApiResponseBuilder.success(result.data, 'Account ledger lines', { pagination: { ... } })
}
```

Inject `AccountBalancesService` into `AccountsController`.

- [ ] **Step 3: Delete `account-balances.controller.ts`** and remove from `accounts.module.ts`.

- [ ] **Step 4: Regenerate OpenAPI + run specs**

```bash
pnpm generate
pnpm --filter @devloggers/api test -- accounts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts packages/api-contracts
git commit -m "feat(accounting): lazy balance endpoints; retire GET /account-balances"
```

---

### Task 3.4: api-client — `balance(id)`, `childrenBalances(parentId)`; drop `balances()`

**Files:**
- Modify: `packages/api-client/src/clients/account.client.ts`

- [ ] **Step 1: Replace `balances()` with `balance(id)` and `childrenBalances(parentId)`**

```ts
balance = (id: string) => this.apiClient.get(accountResource.routes.balance as ApiPathByMethod<'get'>, { params: { id } })
childrenBalances = (parentId: string | 'ROOT') => this.apiClient.get(accountResource.routes.childrenBalances as ApiPathByMethod<'get'>, { query: { parentId } } as never)
```

Update `ledger` to use the new route path (mechanical — the route constant changed in `account.resource.ts`).

- [ ] **Step 2: Build + commit**

```bash
pnpm turbo run build --filter=@devloggers/api-client
git add packages/api-client
git commit -m "feat(api-client): lazy balance methods on AccountsClient"
```

---

### Task 3.5–3.10: Dashboard rewrite (split for clarity; each is a focused task)

> These tasks are sequential; the `useAccountBalances` hook deletion must land after all consumers (`accounts-page.tsx`, `accounts-form.tsx`, `accounts-tree.tsx`) stop using it.

#### Task 3.5: Dashboard types + resource plumbing

- [ ] **Step 1:** Update `apps/dashboard/modules/accounts/accounts.types.ts` — replace `AccountBalanceItem` with `AccountBalanceSummary` (new fields); add `isPostable`, `isContra`, `deletedAt` to `AccountListItem`.
- [ ] **Step 2:** `accounts.resource.ts` stays unchanged in shape (resource drives CRUD list/tree).
- [ ] **Step 3: Commit.** `feat(accounts/dashboard): types for AccountBalanceSummary`.

#### Task 3.6: Hooks — `useAccountBalance`, `useChildrenBalances`, `useAccountBreadcrumb`; delete `useAccountBalances`

- [ ] **Step 1:** Create the three hooks per spec Section 5.1; each issues `api.chartOfAccounts.<method>` with `staleTime: 30_000`.
- [ ] **Step 2:** Add `invalidateAccountBalances(queryClient)` helper in `hooks/index.ts`.
- [ ] **Step 3:** Delete `hooks/use-account-balances.ts` and the `ACCOUNT_BALANCES_KEY` export.
- [ ] **Step 4: Commit.** `feat(accounts/dashboard): lazy balance hooks`.

#### Task 3.7: `account-balances-panel.tsx` rewire + new "hide group accounts" toggle

- [ ] **Step 1:** Replace the props-derived `items` flow with `useAccountBalance(selectedId)` + `useChildrenBalances(selectedId ?? 'ROOT')` + `useAccountBreadcrumb(selectedId)`.
- [ ] **Step 2:** Add a header toggle "Hide group accounts" (default on) — filters `rows.filter(r => r.isPostable)` when on.
- [ ] **Step 3:** Drop `buildChildrenIndex`/`getChildRows` usage; breadcrumb via the new hook.
- [ ] **Step 4: Commit.** `feat(accounts/dashboard): lazy balance panel`.

#### Task 3.8: `account-balances-table.tsx` — switch `hasChildren(index, id)` → `row.childrenCount > 0`

- [ ] **Step 1:** Drop the `index` prop; replace `hasChildren` callsite; widen row type to `AccountBalanceSummary`.
- [ ] **Step 2: Commit.**

#### Task 3.9: `accounts-tree.tsx` and `account-picker.tsx` — `isPostable` badges + `defaultSelectable` update

- [ ] **Step 1:** In `account-tree-node.tsx`, render a "group" pill when `!isPostable`, a "contra" pill when `isContra`.
- [ ] **Step 2:** `accounts-tree.tsx` `defaultSelectable` → `(node) => node.account.isPostable && node.account.isActive && !node.account.deletedAt`.
- [ ] **Step 3:** `account-picker.tsx` accepts an optional `expectedType: AccountType` filter; `selectable` filters by `node.account.type === expectedType && node.account.isPostable && node.account.isActive && !node.account.deletedAt`. Visual dim on non-postable.
- [ ] **Step 4:** Add the "Convert to group" kebab action on `AccountTreeNodeRow` (only when `isPostable === true && childrenCount === 0`) → calls `POST /accounting/chart-of-accounts/:id/convert-to-group`.
- [ ] **Step 5: Commit.** `feat(accounts/dashboard): isPostable/contra badges + picker type filter`.

#### Task 3.10: `accounts-form.tsx` — edit-only `isPostable`/`isContra` fields; config update; test fixtures

- [ ] **Step 1:** Add `isPostable?: boolean` and `isContra?: boolean` to `AccountFormValues` + `accounts.config.ts`. Render as edit-only checkboxes (hidden on create).
- [ ] **Step 2:** Update `lib/build-account-tree.test.ts` and `lib/account-balances.test.ts` fixtures to include the new fields. Delete `account-balances.test.ts` if `buildChildrenIndex`/`getChildRows` are gone.
- [ ] **Step 3:** `pnpm turbo run build --filter=@devloggers/dashboard`.
- [ ] **Step 4: Commit.** `feat(accounts/dashboard): form + test updates for new account flags`.

---

## Phase 4 — Stock-count & opening-balance cancellation flows

### Task 4.1: `StockCountsService.cancel`

**Files:**
- Modify: `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts`
- Modify: `apps/api/src/modules/inventory/stock-counts/stock-counts.controller.ts`
- Create: `stock-counts.service.spec.ts` cancel tests

- [ ] **Step 1:** Add `cancel(tenantId, stockCountId, userId)`:

```ts
async cancel(tenantId: string, stockCountId: string, userId: string) {
  const stockCount = await this.prisma.stockCount.findFirst({
    where: { id: stockCountId, tenantId },
    include: { fiscalPeriod: { select: { status: true } }, lines: true },
  })
  if (!stockCount) throw new NotFoundException('Stock count not found')
  if (stockCount.status !== 'POSTED') throw new BadRequestException('Only posted stock counts can be cancelled')

  const original = await this.prisma.journalEntry.findFirst({
    where: { tenantId, referenceType: ReferenceType.STOCK_COUNT, referenceId: stockCount.id, status: 'POSTED' },
  })
  if (!original) throw new BadRequestException('Original journal entry not found for this stock count.')

  const originalMovements = await this.prisma.stockMovement.findMany({
    where: { tenantId, referenceType: 'stock_count', referenceId: stockCount.id },
  })

  const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY')

  return this.prisma.$transaction(async (tx) => {
    for (const mv of originalMovements) {
      await this.inventoryService.postMovementTx(tx as any, {
        tenantId,
        warehouseId: mv.warehouseId,
        itemId: mv.itemId,
        fiscalPeriodId: stockCount.fiscalPeriodId,
        movementType: StockMovementType.ADJUSTMENT,
        quantity: -Number(mv.quantity),
        unitCost: Number(mv.unitCost),
        referenceType: 'stock_count_cancellation',
        referenceId: stockCount.id,
        notes: `Cancellation of stock count ${stockCount.number}`,
        userId,
      })
    }

    await this.journalPosting.reverse(tx, {
      tenantId,
      number: jeNumber,
      originalEntryId: original.id,
      referenceType: ReferenceType.STOCK_COUNT_CANCELLATION,
      referenceId: stockCount.id,
      description: `Reversal of stock count ${stockCount.number}`,
      exchangeRate: 1,
      userId,
      reversalDate: stockCount.date,
      fiscalPeriodId: stockCount.fiscalPeriodId,
      fiscalPeriodStatus: stockCount.fiscalPeriod?.status,
    })

    return tx.stockCount.update({
      where: { id: stockCountId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
    })
  })
}
```

- [ ] **Step 2:** Add the route on the controller (`@Post(':id/cancel')`).
- [ ] **Step 3:** Write the spec: reversal called once; stock movements negated; status `CANCELLED`. Run:
```bash
pnpm --filter @devloggers/api test -- stock-counts
```
- [ ] **Step 4: Commit.** `feat(stock-counts): cancel flow reverses GL + stock movements`.

---

### Task 4.2: `InventoryService.cancelOpeningBalance`

**Files:**
- Modify: `apps/api/src/modules/inventory/inventory.service.ts`
- Modify: `apps/api/src/modules/inventory/inventory.controller.ts` (or the relevant controller that already exposes registerOpeningBalance)

- [ ] **Step 1:** Add `cancelOpeningBalance(tenantId, warehouseId, userId)`. Symmetric to 4.1: load original JE by `referenceType: OPENING_BALANCE, referenceId: warehouseId`, reverse stock movements with negated quantity at original `unitCost`, then `journalPosting.reverse` with `ReferenceType.OPENING_BALANCE_CANCELLATION` and `reversalDate: original.date`.

- [ ] **Step 2:** Add the route.
- [ ] **Step 3:** Run + commit.

```bash
pnpm --filter @devloggers/api test -- inventory
git add apps/api/src/modules/inventory
git commit -m "feat(inventory): cancelOpeningBalance reverses GL + stock movements"
```

---

## Phases Final Gate

### Task F.1: Build + OpenAPI regen + final tests + lint

- [ ] **Step 1:** From repo root:

```bash
pnpm turbo run build
pnpm generate
pnpm --filter @devloggers/api test
pnpm lint
```

Expected: every step green.

- [ ] **Step 2:** Grep audits:

```bash
rg -n "currentBalance" apps packages
rg -n "createPostingJournalEntry" apps/api/src
rg -n "tx\.journalEntry\.create" apps/api/src
rg -n "'invoice'|'payment'|'expense'|'opening_balance'|'stock_count'" apps/api/src/modules/invoicing apps/api/src/modules/inventory
```

Expected: only `StockMovement`-bound strings (column still a string).

- [ ] **Step 3:** Tag the release.

```bash
git commit --allow-empty -m "release(accounting): COA refactor + lazy balances + posting facade + reversal flows"
```

---

## Roadmap items (out of scope, recorded for follow-up specs)

1. **Per-warehouse inventory/COGS/adjustment accounts** — add optional account slots on the `Warehouse` model (fallback to `FinancialSetting`), with a warehouse-form UI and "per-warehouse valuation" reporting. Requires its own design spec.
2. **Trial-balance / closing entries** — period-close mechanics, opening-balance primitives on `JournalLine`, year-end roll-forward. Reporting-spec territory.
3. **Materialized-path / closure-table for `ChartOfAccount`** — only needed if a tenant's chart depth grows beyond ~5 levels; current seeded depth is 3 and the new `parentId` index keeps `rolledBalance` reads sub-second.
4. **Reversal-date picker on voids** — give operators a "void as of date" choice rather than always defaulting to the original entity date. UX flow.