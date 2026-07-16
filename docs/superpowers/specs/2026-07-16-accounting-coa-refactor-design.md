# Accounting refactor — Chart of Accounts, posting flows, lazy balances

- **Status:** Draft (pending user review)
- **Date:** 2026-07-16
- **Scope movement:** ERP-wide accounting correctness release (NestJS API + dashboard + contracts + client), all-in-one coherent release
- **Out of scope (roadmap):** Per-warehouse inventory/COGS/adjustment accounts (Warehouse-module schema + UI); trial-balance / closing entries; materialized-path / closure-table optimization for pathological trees.
- **Phase sequencing:** Approach 1 — vertical-slice contract lock. Phases are review checkpoints of a single release, not separately shipped releases.

## Decisions (locked during brainstorming)

| Area | Decision |
|---|---|
| Leaf/posting model | **Explicit `isPostable` flag** on `ChartOfAccount`, decoupled from hierarchy (a parent with no children can stay `isPostable=false`; postable accounts can opt to act as both, rare). |
| Balance storage | **Drop `currentBalance`.** Source of truth = `JournalLine`. All balances computed on read from indexed `GROUP BY accountId`. No denormalized cache, no drift. |
| Lazy balances API | **Ship both:** (a) single-node balance endpoint (breadcrumb + drill summary), (b) children-of endpoint (one table level). `GET /account-balances` (all accounts) is deleted. |
| Contra accounts | **Add `isContra` flag.** `getAccountBalanceDelta` inverts normal side when true. Seed `1220 Accumulated Depreciation` as `isContra=true`. |
| Scope | **All-in-one.** Schema + facade + all consumer sweeps + lazy API + dashboard + reversal flows + fiscal-period guard on Expenses/Payments + FS slot validation + `ReferenceType` enum + reversal-date field + stock-count/opening reversal flows + onboarding slot backfill. Per-warehouse accounts deferred to roadmap. |
| Per-warehouse inventory accounts | **Out of scope.** Documented as roadmap item. Tenant-global `FinancialSetting` slots stay. |
| Migration strategy | **Project is in dev — re-seed + reset migrations from scratch.** No backfill code required. |
| Soft delete | **Add `deletedAt DateTime? @map("deleted_at")`.** DELETE = archive (set `deletedAt=now()`, `isPostable=false` atomically). Forbidden when the account has journal lines. Optional `restore` action. |
| Sequencing | **Approach 1 — vertical-slice contract lock.** Phase 1 (schema + facade) → Phase 2 (consumer sweep) → Phase 3 (lazy balances API + dashboard) → Phase 4 (stock-count / opening reversal flows). |

## Audit findings (the problem space)

### A. Leaf-vs-parent (the triggering concern)

Best practice (Odoo / ERPNext / SAP / NetSuite): postings land only on *posting* (leaf) accounts; parent/control accounts are summaries whose balance is the rolled sum of their descendants. The constraint is enforced by an explicit flag, not inferred from hierarchy depth.

Current state:
- `packages/db-prisma/src/schema/accounting.prisma:17` — `ChartOfAccount` has **no leaf/posting concept**. Leaf-ness is purely implicit (a node happens to have no children today).
- `apps/api/src/modules/accounting/accounts/services/accounts.service.ts:44` — `beforeCreate` only checks code uniqueness; `beforeUpdate` (line 51) only checks non-self-parent. **Nothing blocks postings to parent accounts, and nothing blocks adding a child under a leaf that already carries journal lines.**
- `apps/api/src/modules/accounting/accounts/utils/account-balance.utils.ts:19` — `updateAccountBalances` increments `currentBalance` on whatever `accountId` it is handed; parent and leaf alike.
- `apps/api/src/modules/identity/onboarding/services/onboarding.service.ts:204-251` — seeds a 3-level template where level-1/2 are parents and level-3 are leaves by convention, but nothing records that intent.

Concrete double-count risk: if anyone posts a journal line to a parent, `rollUpBalances` (`utils/roll-up-balances.ts`) counts the parent's `ownBalance` **and** rolls its children into it — the figure is silently inflated.

### B. `/account-balances` API (eager-house)

- `apps/api/src/modules/accounting/accounts/services/account-balances.service.ts:17` — `getBalances` loads **every account + every journal-line sum** for the whole tenant in one request. O(accounts × postings) per page load.
- `apps/api/src/modules/accounting/accounts/controllers/account-balances.controller.ts:21` — single `GET /accounting/account-balances` with no `parentId`, cursor, or level parameter — all-or-nothing.
- `apps/dashboard/modules/accounts/hooks/use-account-balances.ts:20` — pulls it eagerly on mount. The tree endpoint (`AccountsService.getTree`) already exists as a lightweight call — balances is the heavyweight offender, and it isn't lazy.

### C. Secondary issues

1. **DUAL BALANCE SOURCE / DRIFT.** `ChartOfAccount.currentBalance` is written by `updateAccountBalances` after every posting but never read (`account-balance.utils.ts:19` writes it; `account-balances.service.ts:25-32` recomputes from scratch). Two independent sources invite silent drift.
2. **FISCAL-PERIOD GUARD GAPS.** `assertFiscalPeriodOpen` (`utils/assert-period-open.ts`) is wired in invoices (`invoice-posting.service.ts:34,131,247`), opening balance (`inventory.service.ts:118`) and stock counts (`stock-counts.service.ts:97`). **Expenses post/cancel** (`expenses.service.ts:104-153, 155-206`) and **Payments post/cancel** (`payments.service.ts:103-168, 170-233`) call `assertFiscalPeriodOpen` nowhere. Closed periods silently accept postings.
3. **NO FS LEAF/TYPE VALIDATION.** `FinancialSettingsService.upsert` accepts any account id for any slot. No type-vs-slot validation; nothing enforces that a configured AR account is ASSET, postable, or active.
4. **`referenceType` IS BARE STRINGS.** Eight values (`expense`, `expense_cancellation`, `invoice`, `invoice_cancellation`, `payment`, `payment_cancellation`, `opening_balance`, `stock_count`) duplicated as ad-hoc literals across 9 call sites. No `ReferenceType` enum, no DB constraint. Typos are invisible.
5. **NO REVERSAL PATH FOR STOCK-COUNT / OPENING-BALANCE.** `buildStockCountVarianceLines` and `buildOpeningBalanceLines` (`inventory-journal.ts:21,33`) have no `reverse` option. Neither `StockCountsService` nor `InventoryService.registerOpeningBalance` exposes a cancel flow. Reverse a stock count ⇒ wrong inventory GL forever.
6. **INVENTORY ACCOUNTS GLOBAL PER TENANT.** The `warehouses` module carries no account fields. Multi-warehouse tenants cannot value Warehouse A and Warehouse B in separate Inventory GL accounts. **Out of scope**, documented as roadmap item.
7. **ONBOARDING UNDER-SEEDS FINANCIAL SETTINGS.** `onboarding.service.ts:87-99` `stepGlDefaults` fills only 5 of 9 slots. Inventory/COGS/Adjustment/OpeningEquity left null — opening-balance, stock-count, and sales-invoice COGS posting all throw "No default X account configured" until the tenant manually completes the form. Inventory features are non-functional post-onboarding.
8. **HARD DELETE UNPROTECTED.** `accounting.controller.ts:41` delete description claims it fails if journal lines reference it (true — FK constraint), but there's no pre-check, no soft-delete. Replaced by `deletedAt` soft delete with explicit `beforeDelete` guard.
9. **CANCELLATION DATES USE `new Date()` BUT THE ORIGINAL FISCAL PERIOD.** Invoices, payments, and expenses post the reversal dated *today* but into the *original* entity's `fiscalPeriodId`. Reversal sits at today's date while stock was reversed at the original period. Leads is misleading chronologically. Best practice: reversal dated in the same period as the original, ideally the same date.
10. **NO `JournalLine` OPENING-BALANCE PRIMITIVE.** There's no way to represent a fixed opening balance for a leaf at period start (only aggregate flows). Trial-balance / closing entries not modeled. **Out of scope**, roadmap item.
11. **CONTRA ACCOUNT MISHANDLED.** `getAccountBalanceDelta` (`account-balance.utils.ts:10`) is correct but has no per-account normal-side override. Seeded `1220 Accumulated Depreciation` is `ASSET` type (`onboarding.service.ts:226`) but actually carries a credit-normal balance. Posting depreciation there flips the signed balance the wrong way in reports.

### D. Cross-module interaction summary

| Posting flow | Posts to leaves explicitly? | Reversal correct? | Fiscal-period guarded? | Reversal flow implemented? |
|---|---|---|---|---|
| Purchase invoice | ✗ | ✓ (manual swap) | ✓ | ✓ |
| Sales invoice (+COGS) | ✗ | ✓ | ✓ | ✓ |
| Payment post/cancel | ✗ | ✓ | ✗ **gap** | ✓ |
| Expense post/cancel | ✗ | ✓ | ✗ **gap** | ✓ |
| Stock-count variance | ✗ | — | ✓ | ✗ **none** |
| Opening balance | ✗ | — | ✓ | ✗ **none** |

---

## Section 1 — Data model & schema

### `packages/db-prisma/src/schema/accounting.prisma`

```
model ChartOfAccount {
    id        String      @id @default(uuid())
    tenantId  String      @map("tenant_id")
    code      String
    name      Json        @db.JsonB
    type      AccountType
    parentId  String?     @map("parent_id")
    isActive  Boolean     @default(true) @map("is_active")
    isPostable Boolean     @default(true) @map("is_postable")
    isContra   Boolean     @default(false) @map("is_contra")
    deletedAt  DateTime?  @map("deleted_at")
    createdAt DateTime    @default(now()) @map("created_at")
    updatedAt DateTime    @updatedAt @map("updated_at")
    // REMOVED: currentBalance Decimal ← dropped, source of truth is JournalLine

    tenant       Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    parent       ChartOfAccount?  @relation("AccountHierarchy", fields: [parentId], references: [id])
    children     ChartOfAccount[] @relation("AccountHierarchy")
    journalLines JournalLine[]
    expenseItems ExpenseItem[]    @relation("ExpenseItemAccount")
    linkedCashboxes Cashbox[]     @relation("CashboxLinkedAccount")
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

    @@unique([tenantId, code])
    @@index([tenantId])
    @@index([parentId])   // NEW — speeds subtree fetches for rolledBalance + cascade
    @@map("chart_of_accounts")
}

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

model JournalEntry {
    id             String             @id @default(uuid())
    tenantId       String             @map("tenant_id")
    number         String
    date           DateTime
    fiscalPeriodId String             @map("fiscal_period_id")
    referenceType  ReferenceType?     @map("reference_type")   // was String?
    referenceId    String?            @map("reference_id")
    description    String?
    status         JournalEntryStatus @default(DRAFT)
    exchangeRate   Decimal            @default(1) @map("exchange_rate") @db.Decimal(18, 6)
    postedAt       DateTime?          @map("posted_at")
    reversalOfId   String?            @map("reversal_of_id")   // NEW — self-FK to original
    reversalDate   DateTime?          @map("reversal_date")    // NEW — explicit
    createdBy      String             @map("created_by")
    createdAt      DateTime           @default(now()) @map("created_at")
    updatedAt      DateTime           @updatedAt @map("updated_at")

    tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    fiscalPeriod FiscalPeriod @relation(fields: [fiscalPeriodId], references: [id])
    reversalOf   JournalEntry? @relation("JournalReversals", fields: [reversalOfId], references: [id])
    reversedBy   JournalEntry[] @relation("JournalReversals")
    lines        JournalLine[]

    @@unique([tenantId, number])
    @@index([tenantId])
    @@index([referenceType, referenceId])   // NEW — cancellation lookups
    @@map("journal_entries")
}

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

    journalEntry JournalEntry   @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
    account      ChartOfAccount @relation(fields: [accountId], references: [id])
    party        Party?         @relation("JournalLineParty", fields: [partyId], references: [id])

    @@index([tenantId])
    @@index([journalEntryId])
    @@index([accountId])   // NEW — single-account balance sums
    @@map("journal_lines")
}
```

Field summary:

| Field | Purpose |
|---|---|
| `ChartOfAccount.isPostable` (default true) | Posting guard — false rejects new `JournalLine`s. |
| `ChartOfAccount.isContra` (default false) | Inverts `getAccountBalanceDelta` normal side. |
| `ChartOfAccount.deletedAt` (nullable) | Soft-delete tombstone. Active queries filter `deletedAt: null`. |
| `ChartOfAccount.currentBalance` | **REMOVED.** All balances recomputed on read. |
| `JournalEntry.referenceType` | Now enum; no bare strings. |
| `JournalEntry.reversalOfId` | Self-FK: cancellation → original. Powers "view reversal link" client-side. |
| `JournalEntry.reversalDate` | Explicit reversal date (defaults to original entity date). Chronologically informative next to `date`. |
| New indexes | `ChartOfAccount(parentId)`, `JournalEntry(referenceType, referenceId)`, `JournalLine(accountId)`. |

**Migration:** reset from scratch (dev). `pnpm --filter @devloggers/db-prisma db:migrate:dev` regenerates a clean migration set — no backfill.

---

## Section 2 — Unified posting facade & enforcement helpers

### The facade — `JournalPostingService`

Replaces the free function `createPostingJournalEntry` (`apps/api/src/modules/accounting/accounts/utils/create-posting-journal-entry.ts`). Single NestJS injectable, single test surface, every rule runs once.

```
@Injectable()
class JournalPostingService {
  post(tx, input: PostInput): Promise<{ id: string }>    // forward posting
  reverse(tx, input: ReverseInput): Promise<{ id: string }> // cancellation
}
```

Both run **inside the caller's `$transaction`** (callers still wrap entity-status updates + stock movements atomically). The facade does NOT own the transaction.

### `PostInput` shape

```
interface PostInput {
  tenantId: string
  number: string
  date: Date
  fiscalPeriodId: string
  fiscalPeriodStatus: string   // caller pre-fetches; facade re-validates
  referenceType: ReferenceType
  referenceId: string
  description: string
  exchangeRate: number
  userId: string
  lines: PostingJournalLine[]
}
```

### Validation pipeline (synchronous, before any write)

1. **`assertFiscalPeriodOpen(status)`** — re-export of the existing helper. Throws `BadRequestException` unless `OPEN`. Applies to both `post` and `reverse`. Closes the Expenses/Payments gap automatically once those consumers call the facade.
2. **`assertLinesPostable(tx, accountIds)`** — one prisma `findMany` on `ChartOfAccount` selecting `{ id, isPostable, isContra, type, deletedAt }`. Throws `BadRequestException('Account "<code>" is not postable')` for any `isPostable=false` or `deletedAt != null`. Returns `{ id → { type, isContra } }` so the delta computation has what it needs without a second round-trip. (No `currentBalance` writes — column removed.)
3. **`assertLinesBalanced(lines)`** — total debit must equal total credit (within 0.0001). Belt-and-braces against future builder bugs.
4. **`assertAtLeastOneLine(lines)`** — refuses empty arrays (defensive vs. zero-amount flows).

### `reverse` variant

```
interface ReverseInput {
  tenantId: string
  number: string
  originalEntryId: string
  referenceType: ReferenceType   // *_CANCELLATION
  referenceId: string
  description: string
  exchangeRate: number   // read from original
  userId: string
  reversalDate: Date     // = original entity's date (NOT today)
  fiscalPeriodId: string
  fiscalPeriodStatus: string
}
```

Behavior:
- Loads the original JE+lines (validates existence; throws `BadRequestException('Original entry not found')`).
- Builds swapped debit↔credit lines from the originals (`accountId`, `partyId`, `description`, `sortOrder` order preserved).
- Posts via the same `post` pipeline (fiscal-period + postable + balanced).
- Writes `JournalEntry.reversalOfId = originalEntryId` and `reversalDate = input.reversalDate`.

This replaces the manual swap in `invoice-posting.service.ts:256-263` and the `reverse:true` builder flags. Builders no longer need a `reverse` option — the facade derives reversal lines from historical entries. (In practice every flow has a stored original; `buildPaymentJournalLines` / `buildExpenseJournalLines` `reverse:true` becomes dead code after the sweep — delete it.)

### New shared primitives

**`ReferenceType` TS enum** — mirrors the Prisma enum. Lives in `packages/db-prisma` as the source; mirrored as a TS const-enum (or `as const` object) in `packages/api-contracts/resources/account.resource.ts` (or a new `accounting.types.ts`) so the dashboard can import it. Each `buildXJournalLines` builder types its `referenceType` as `ReferenceType`, not `string`.

**`PostingJournalLine`** — the interface in `create-posting-journal-entry.ts:3` moves to a shared `accounting/accounts/models.d.ts` and is reused by all builders.

**`account-normal-side.ts`** — new file (replaces `account-balance.utils.ts`). `getAccountBalanceDelta` gains the `isContra` parameter:

```ts
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

Read-side (balances API) and write-side (facade delta calculation, if ever needed) use the same primitive. No tests lost, new test coverage added.

### Financial-Settings slot validation

`assertAccountFitsSlot(account, expectedType, slotName)` — used by `FinancialSettingsService.upsert`:

```
throws BadRequestException if:
  account.deletedAt != null
  OR account.isPostable === false
  OR account.type !== expectedType
  OR account.isActive === false
```

Slot type map:

| Slot | Expected type |
|---|---|
| `defaultSales` | REVENUE |
| `defaultPurchase` | EXPENSE |
| `defaultTax` | LIABILITY |
| `defaultReceivable` | ASSET |
| `defaultPayable` | LIABILITY |
| `defaultInventory` | ASSET |
| `defaultCogs` | EXPENSE |
| `defaultInventoryAdjustment` | EXPENSE |
| `defaultOpeningEquity` | EQUITY |

Also called at **post time** as defense-in-depth — each consumer verifies its resolved account before calling `post`. Cheap: consumer already fetched settings; one extra `findUnique` (still skipping the same `select { id, isPostable, isContra, type, deletedAt, isActive }`).

### Fiscal-period handling

`assertFiscalPeriodOpen` stays a free function (reused by the facade and any future direct caller). Expenses and Payments currently fetch `payment.fiscalPeriodId` but never the status — they'll add `include: { fiscalPeriod: { select: { status: true } } }` to their `findById` and pass it through. The facade re-validates defensively.

### Removals

- `utils/create-posting-journal-entry.ts` — deleted; body absorbed into `JournalPostingService.post`.
- `utils/account-balance.utils.ts` — `updateAccountBalances` deleted (no column to update). `getAccountBalanceDelta` moves to `utils/account-normal-side.ts` with the `isContra` parameter.
- `utils/roll-up-balances.ts` — stays; only read-side (balances API). Posting never touches it.

### Migration of existing code

Project is in dev → no backfill. Regenerate the client, fix the 9 call-sites in the consumer sweep (Section 4), update mocks in tests, and `pnpm test`.

---

## Section 3 — Lazy balances read API

### New endpoints (both live on `AccountsController`)

**Endpoint A — Single-node balance (breadcrumb + drill summary):**

```
GET /accounting/chart-of-accounts/{id}/balance

200 → AccountBalanceSummaryDto {
  id, code, name, nameI18n, type, isPostable, isContra, isActive,
  parentId, parentCode, parentName,
  ownBalance, rolledBalance, childrenCount
}
```

- `ownBalance` = `Σ delta` (debit-normal minus credit-normal, contra-flipped) over POSTED lines on this account.
- `rolledBalance` = node's own + Σ descendants' own (server-side, via `rollUpBalances` scoped to the subtree rooted at `{id}`).
- `childrenCount` = `_count children where deletedAt=null`.

Performance: single indexed `GROUP BY accountId` for `ownBalance`. For `rolledBalance`: prefetch subtree accounts + one `groupBy accountId IN (subtreeIds)` + `rollUpBalances`. Trees are shallow (3 levels seeded); the indexed `parentId` makes the subtree fetch cheap. Pathological-depth migration to materialized-path / closure-table is roadmap (out of scope).

**Endpoint B — Children-of balance roll (the visible table level):**

```
GET /accounting/chart-of-accounts/children-balances?parentId={id|ROOT}

200 → AccountChildrenBalancesResponseDto {
  items: AccountBalanceSummaryDto[],
  parent: AccountBalanceSummaryDto | null
}
```

- `parentId=ROOT` (literal string) → top-level accounts (those with `parentId=null`), grouped by `type` on the client as today (`account-balances-panel.tsx:71-90`).
- For a real `parentId` → direct children only, one level deep.
- Each child's `rolledBalance` is computed from its subtree (server-side). Parent's `rolledBalance` (via Endpoint A) is the roll-up of **all** its descendants — the two endpoints never overlap in responsibility.
- Per-level batch: sums via one `groupBy accountId IN (childIds)` (not N+1), then `rollUpBalances` scoped per child subtree via a single subtree accounts prefetch.
- One round-trip per level ≈ 9-20 accounts typically; trivial payload.

### Removed endpoint

`GET /accounting/account-balances` (all accounts) — deleted outright (dev reset).

### Moved endpoint

`GET /accounting/account-balances/{id}/ledger` → `GET /accounting/chart-of-accounts/{id}/ledger`. Same pagination semantics; route moved for cohesion. (Consumer sweep phase updates the client + resource; dashboard's `use-account-ledger.ts` swap is mechanical.)

### Repository additions (`accounts.repository.ts`)

```
findBalanceForAccount(tenantId, id): Promise<AccountBalanceRow|null>
  // fetches account row (no deleted) + sums one account + counts children

findChildrenBalanceSummaries(tenantId, parentId|null): Promise<AccountBalanceRow[]>
  // direct children + batched per-child sums via groupBy + per-child rollUp

computeRolledBalance(tenantId, subtreeRootId): number
  // prefetch subtree accounts + sums, run rollUpBalances, return root's value
```

All filter `deletedAt: null`. Subtree prefetch: one `findMany where: { tenantId, OR: <descendantsOf(parent)> }` walk — trees are shallow; the indexed `parentId` keeps this trivial.

### Service layer refactor (`AccountBalancesService`)

The existing `getBalances` (all-accounts call) is removed. `getLedger` stays untouched. New methods:

```
getBalance(tenantId, id): Promise<AccountBalanceSummaryDto>
getChildrenBalances(tenantId, parentId|null): Promise<{ items, parent }>
```

Both delegate to the repo. Server-side `rollUpBalances` is reused as-is — it was always correct, just run from a smaller per-level dataset now.

### Controller

`AccountBalancesController` (`account-balances.controller.ts`) is retired; the two new routes mount on `AccountsController` (already has `/tree` as a sibling — same pattern). Cleaner routing surface (`/accounting/chart-of-accounts/...` owns the whole account namespace).

### DTOs (`packages/api-contracts` + `apps/api/.../dto/`)

- **New** `AccountBalanceSummaryDto` — the row shape: `{ id, code, name, nameI18n, type, isPostable, isContra, isActive, parentId, parentCode, parentName, ownBalance, rolledBalance, childrenCount }`. Replaces `AccountBalanceDto`.
- **New** `AccountChildrenBalancesResponseDto` — `{ items: AccountBalanceSummaryDto[], parent: AccountBalanceSummaryDto | null }`.
- `ChartOfAccountTreeDto` (`dto/account.dto.ts:99`) gains `isPostable` and `isContra` (drives tree-picker visual badges).
- `ChartOfAccountResponseDto` gains `isPostable`, `isContra`, `deletedAt` (admin views of tombstones).
- Remove `AccountBalanceDto` (`account-balance.dto.ts:7`) — replaced wholesale.

### api-client (`account.client.ts`)

- `balances()` — deleted.
- `balance(id)` — `GET /accounting/chart-of-accounts/{id}/balance`.
- `childrenBalances(parentId: string | 'ROOT')` — `GET /accounting/chart-of-accounts/children-balances?parentId=...`.
- `tree()` — unchanged.
- `ledger(id, query)` — route swap to `/accounting/chart-of-accounts/{id}/ledger` (mechanical).

### Resource contracts (`account.resource.ts`)

```
tree:              '/accounting/chart-of-accounts/tree',
balance:           '/accounting/chart-of-accounts/{id}/balance',
childrenBalances:  '/accounting/chart-of-accounts/children-balances',
ledger:            '/accounting/chart-of-accounts/{id}/ledger',
```

(`balances` removed.)

### Performance

Both endpoints are sub-second on Postgres for the seeded chart (3 levels, ~25 accounts). For thousands of accounts × 100k lines, the indexed `GROUP BY accountId` is still fast. The only scaling concern is recursive subtree fetch for `rolledBalance` on deep trees — addressed by `parentId` index and the shallow seeded depth. Materialized-path upgrade is a documented roadmap item.

---

## Section 4 — Consumer sweep (every posting flow updated)

Every call-site from the audit map migrates to `JournalPostingService`. The facade enforces the fiscal-period guard and the `isPostable` check automatically — so each consumer's diff is mostly: delete the raw `createPostingJournalEntry` import, inject `JournalPostingService`, call `post`/`reverse`, fetch `fiscalPeriod.status` if not already fetched, drop the `{reverse:true}` builders.

### 4.1 Invoices (`invoicing/invoices/invoice-posting.service.ts`)

- **`postPurchaseInvoice` (line 97)** — `journalPosting.post(tx, { referenceType: ReferenceType.INVOICE, ... lines, fiscalPeriodStatus })`. Already asserts period open (line 34); facade re-validates. Slot validation at the top: `payableAccountId` (LIABILITY), `purchaseAccountId` (EXPENSE), `inventoryAccountId` (ASSET), `taxAccountId` (LIABILITY) via `assertAccountFitsSlot`.
- **`postSalesInvoice` (line 206)** — same pattern. Slots: `receivableAccountId` (ASSET), `salesAccountId` (REVENUE), `taxAccountId` (LIABILITY), `cogsAccountId` (EXPENSE), `inventoryAccountId` (ASSET). Combined `[...revenueLines, ...cogsLines]` still one entry — facade checks balance once.
- **`cancelInvoice` (line 256-300)** — `journalPosting.reverse(tx, { originalEntryId: original.id, referenceType: ReferenceType.INVOICE_CANCELLATION, referenceId: invoice.id, description, userId, reversalDate: invoice.date, fiscalPeriodId: invoice.fiscalPeriodId, fiscalPeriodStatus })`. Stock-movement reversal loop (line 270-287) stays unchanged — sub-ledger, not GL. **Reversal date = original `invoice.date`** (not `new Date()` — closes audit issue #9).

### 4.2 Payments (`invoicing/payments/payments.service.ts`)

- **`post` (line 143)** — facade `post` with `ReferenceType.PAYMENT`. **Add `include: { fiscalPeriod: { select: { status: true } } } }`** to `findById` (line 41) so the facade can assert period open — closes the gap. Slots: `cashbox.linkedAccountId` (ASSET), counterpart AR (ASSET) / AP (LIABILITY).
- **`cancel` (line 208)** — facade `reverse(tx, { originalEntryId: loadedOriginal.id, referenceType: ReferenceType.PAYMENT_CANCELLATION, ... reversalDate: payment.date })`. **Load the original JE** first (`findFirst where { referenceType: PAYMENT, referenceId: payment.id, status: POSTED }` — currently not done; payments rebuild lines via the builder's `reverse:true` instead of from the stored original). Switching to stored-original reversal matches invoices. Cashbox balance side effects (line 221) stay.
- **`PaymentJournalInput` `reverse` flag** — becomes dead code after this sweep; remove it from `payment-journal.ts:31`.

### 4.3 Expenses (`invoicing/expenses/expenses.service.ts`)

- **`post` (line 128)** — facade `post` with `ReferenceType.EXPENSE`. **Add fiscal-period fetch + guard** — closes the gap. Slot validation: each `ExpenseItem.accountId` must be a postable EXPENSE-type leaf; `cashbox.linkedAccountId` must be ASSET. The per-item `accountId` validation is novel today — closes audit issue #3.
- **`cancel` (line 181)** — facade `reverse` from stored original (load original JE like payments/invoices do). Reversal date = `expense.date`.
- **`expense-journal.ts` `reverse` flag** — same as payments, becomes dead code; remove.

### 4.4 Stock counts (`inventory/stock-counts/stock-counts.service.ts`)

- **`post` (line 138)** — facade `post` with `ReferenceType.STOCK_COUNT`. Already asserts period open (line 97). Slots: `inventoryAccountId` (ASSET), `adjustmentAccountId` (EXPENSE). Nothing structurally changes besides the facade swap.
- **NEW: `cancel` flow** — `StockCountsService.cancel(tenantId, stockCountId, userId)`:
  1. Guard: status `POSTED`, fiscal period open (facade re-validates).
  2. Load original JE (`referenceType: STOCK_COUNT, referenceId: stockCountId`).
  3. For each original `StockMovement` posts an opposite `StockMovementType.ADJUSTMENT` with negated quantity at original `unitCost` (preserves `averageCost`, same trick as invoice cancellation).
  4. Facade `reverse(tx, { originalEntryId, referenceType: ReferenceType.STOCK_COUNT_CANCELLATION, reversalDate: stockCount.date })`. New enum value `STOCK_COUNT_CANCELLATION` already in the enum.
  5. Sets status `CANCELLED`.
- `buildStockCountVarianceLines` doesn't need a `reverse` flag — the facade generates the reversal from stored lines.

### 4.5 Opening balance (`inventory/inventory.service.ts`)

- **`registerOpeningBalance` (line 140)** — facade `post` with `ReferenceType.OPENING_BALANCE`. Already asserts period open (line 118). Slots: `inventoryAccountId` (ASSET), `openingEquityAccountId` (EQUITY).
- **NEW: `cancelOpeningBalance` flow** — symmetric to stock-count cancel. Reverses stock movements + posts `OPENING_BALANCE_CANCELLATION`. New enum value already in the enum. Closes audit issue #5.

### 4.6 Onboarding (`identity/onboarding/services/onboarding.service.ts`)

- **`bootstrapChartOfAccounts` (line 129)** update:
  - Level-1 + Level-2 entries get **`isPostable: false`** in their `create` payloads (lines 150-159, 165-175, 181-191).
  - `1220` Accumulated Depreciation gets **`isContra: true`**.
- **`stepGlDefaults` (line 87-99)** — backfill the remaining 4 slots so post-onboarding inventory features work:
  - `defaultInventoryAccountId` → `1130` Inventory
  - `defaultCogsAccountId` → `5100` COGS
  - `defaultInventoryAdjustmentAccountId` → a **new template leaf `5210` Inventory Adjustments** (added under `5000` Cost of Sales, EXPENSE type). Adds one row to the `getCoaTemplate` return; we don't recycle `5100` COGS to keep COGS reporting clean.
  - `defaultOpeningEquityAccountId` → `3100` Owner's Equity.
- Closes audit issue #7.

### 4.7 Financial Settings (`accounting/financial-settings/`)

- `FinancialSettingsService.upsert` — wire `assertAccountFitsSlot` for all 9 slots. Throws `BadRequestException('Account "<code>" is not a valid <slotName> (must be <expectedType>, postable, active)')` for invalid picks.
- DTO shape unchanged; OpenAPI descriptions updated to mention the leaf/postable warning.

### 4.8 `referenceType` enum sweep

Every literal becomes `ReferenceType.X`:

| Old string | New enum |
|---|---|
| `'invoice'` | `INVOICE` |
| `'invoice_cancellation'` | `INVOICE_CANCELLATION` |
| `'payment'` | `PAYMENT` |
| `'payment_cancellation'` | `PAYMENT_CANCELLATION` |
| `'expense'` | `EXPENSE` |
| `'expense_cancellation'` | `EXPENSE_CANCELLATION` |
| `'opening_balance'` | `OPENING_BALANCE` |
| `'stock_count'` | `STOCK_COUNT` |
| **new** | `STOCK_COUNT_CANCELLATION` |
| **new** | `OPENING_BALANCE_CANCELLATION` |

The enum's source of truth is `packages/db-prisma/src/schema/accounting.prisma`, re-exported from `@devloggers/db-prisma`, mirrored as a TS const-enum/`as const` object in `packages/api-contracts` for dashboard import. No more bare-string typos (audit issue #4).

### 4.9 Reversal-date discipline

All cancellation flows date the reversal entry with the **original entity's date**, not `new Date()`. Closes audit issue #9. The `JournalEntry.reversalDate` records it explicitly; the `date` column equals the original date. Triggered in invoices (line 289), payments (line 208), expenses (line 181), stock-counts (new cancel), opening-balance (new cancel).

### 4.10 Soft delete wiring

- `AccountsService.delete` — overridden: set `deletedAt: now(), isPostable: false` (atomic). Rejected (throw `ConflictException`) if the account has any `JournalLine` rows (`beforeDelete` count check). Closes audit issue #8.
- The CRUD controller's DELETE endpoint stays (DELETE = "archive"), semantics flip. OpenAPI description updated: "Archives the account (soft delete). Forbidden if the account has journal entries."
- New restore action: `PATCH /accounting/chart-of-accounts/:id/restore` → nulls `deletedAt`, restores `isPostable` (only if no journal lines yet — otherwise leave postable alone per the entity-state machinery). Light addition.

### 4.11 Test updates

- Existing: `invoice-posting.service.spec.ts`, `invoice-posting.perpetual.spec.ts`, `account-balances.service.spec.ts`, `accounts.service.spec.ts`, `accounts.repository.spec.ts` — rewrite mocks from `tx.journalEntry.create` to `journalPosting.post`/`reverse`. Mock-zero-state behavior changes (no `currentBalance` writes); assertion shapes update accordingly.
- New tests:
  - `JournalPostingService` unit tests (validate pipeline: postable check, balanced, period-open, contra delta, reversal correctness)
  - Stock-count cancel flow tests
  - Opening-balance cancel flow tests
  - FS slot validation tests (one per slot × invalid/valid scenarios)
  - Soft-delete guard tests (forbidden-with-lines, archive, restore)
  - Reference-type enum sweep smoke test (no bare strings escape)

### 4.12 Module wire-up

`AccountsModule` providers list updates: register `JournalPostingService`, export it for `InvoicingModule`, `ExpensesModule`, `InventoryModule` consumers. `InvoicesModule`, `PaymentsModule`, `ExpensesModule`, `InventoryModule`, `StockCountsModule` inject `JournalPostingService` via the `AccountsModule` export.

---

## Section 5 — Dashboard rewrite

### 5.1 Hooks (`apps/dashboard/modules/accounts/hooks/`)

**`use-account-balances.ts` — deleted.** Replaced by:

```
use-account-balance.ts
  useAccountBalance(id: string | null)
    → enabled: !!id
    → api.chartOfAccounts.balance(id)
    → AccountBalanceSummary | undefined
    queryKey: ['account-balance', id]
    staleTime: 30_000

use-children-balances.ts
  useChildrenBalances(parentId: string | 'ROOT' | null)
    → enabled: parentId !== null
    → api.chartOfAccounts.childrenBalances(parentId)
    → { items, parent } | undefined
    queryKey: ['account-children-balances', parentId]
    staleTime: 30_000

use-account-breadcrumb.ts
  useAccountBreadcrumb(selectedId: string | null)
    → walks parentId chain via useAccountBalance calls
    → up to 3 requests for the 3-level seeded tree (negligible; cached)
    → BreadcrumbCrumb[]
```

`ACCOUNT_BALANCES_KEY` removed everywhere it was invalidated (`accounts-page.tsx:97,159`, `accounts-form.tsx:36`). Replaced by:

```
invalidateAccountBalances(queryClient, accountId?) {
  queryClient.invalidateQueries({ queryKey: ['account-balance'] })
  queryClient.invalidateQueries({ queryKey: ['account-children-balances'] })
}
```

`use-account-tree.ts`, `use-account-ledger.ts`, `use-accounts-resource.ts` stay (ledger hook route swap to new path — mechanical).

### 5.2 `accounts.resource.ts`

The page no longer uses the global resource list for balances — but the resource still drives the CRUD list/tree (`AccountsResource.Toolbar` search uses `searchIn: ["code","name"]`). Keep the resource; `pageSize: 500` baseline stays for the tree picker (accounts are few). The balances panel stops pulling from the resource's data and uses the new hooks above.

### 5.3 `lib/account-balances.ts` (client-side tree math)

`buildChildrenIndex`, `getChildRows`, `hasChildren` — **deleted.** Server returns `childrenCount` per row, so `hasChildren` becomes a trivial check (`row.childrenCount > 0`). The dashboard's "is this a drillable row" is a server-provided fact, not a client-side computation.

`getBreadcrumbPath` — kept as a fallback utility, but the panel primarily uses the new `useAccountBreadcrumb` hook (chain-walks `parentId` via cached balance responses).

`build-account-tree.ts` (used by the manage surface `AccountsTree`) — stays. That surface needs the full hierarchy for the tree navigation and the parent-picker (`accounts-form.tsx`). It already uses the lightweight `/tree` endpoint. Unchanged.

### 5.4 `components/account-balances-panel.tsx` — restructured

Current: receives entire `items` (all balances) as props, computes client-side `index`/`byId`/`crumbs`/`rows`.

New:

```tsx
const { data: selected } = useAccountBalance(selectedId)        // null → skip
const { data: level } = useChildrenBalances(selectedId ?? 'ROOT')
const crumbs = useAccountBreadcrumb(selectedId)
const rows = level?.items ?? []
```

- Header: `AccountBreadcrumb` driven by `crumbs`. Summary block (`ownBalance`/`rolledBalance`) driven by `selected` — only when `selectedId` non-null; ROOT view hides the summary (or shows the tenant-wide roll via `parent: null` summary — hidden by default, optional toggle).
- When `selectedId === null` — groups `rows` by `ACCOUNT_TYPE_ORDER` (those 5 sections the ROOT view shows today, `account-balances-panel.tsx:71-90`). Each section calls `AccountBalancesTable`.
- When `selectedId` non-null — single `AccountBalancesTable rows={rows}` drill-in.
- `onDrill(id)` → `setSelectedId(id)`; the hook refetches the next level lazily.
- `onOpenLedger(row)` — unchanged; sets `ledgerAccount` local state, renders `AccountLedgerView`.

Result: initial load fetches only **ROOT-level children** (≤ 6 accounts, one per top type). Each drill-in fetches one level. Memory and network per drill-in is constant. Matches the lazy API design.

### 5.5 `components/account-balances-table.tsx`

Minor:
- `hasChildren(index, row.id)` (line 49) → `row.childrenCount > 0`. The `index: Map<string, AccountBalanceItem[]>` prop is dropped.
- Row type widens from `AccountBalanceItem` to the new `AccountBalanceSummary` (adds `isPostable`, `isContra`, `childrenCount`).
- New "hide group accounts" toggle (panel header) — default **on**, hides rows where `isPostable === false`. The ledger-focused user sees just leaf balances; group accounts are visible in the manage tree. Off = show all rows.

### 5.6 `components/accounts-tree.tsx` (`AccountTreeNodeRow`)

- `AccountListItem` type expands: `isPostable`, `isContra`, `deletedAt`.
- `AccountTreeNodeRow` shows a small badge for `isPostable=false` ("group" pill) and for `isContra` ("contra" pill). Visual-only; `deletedAt` rows are filtered out of the manage tree at the resource query.
- "Add child" action stays; new child defaults `isPostable=true` (schema default).
- **New "Convert to group" kebab action** — distinct from "Archive". Convert-to-group sets `isPostable = false` but leaves `deletedAt = null` and `isActive = true` (account still visible in the tree, just no longer postable). Calls a dedicated `POST /accounting/chart-of-accounts/:id/convert-to-group`. Rejected server-side if the account has journal lines (`ConflictException`). Visible only when `isPostable === true && childrenCount === 0`. Archive (the DELETE endpoint) is a separate action that sets `deletedAt` and hides the account. Out of scope: a "convert and migrate lines to a new leaf" UX — the server guard suffices.

### 5.7 `components/accounts-form.tsx`

- `AccountFormValues` (in `accounts.config.ts`) gains `isPostable?: boolean` and `isContra?: boolean` as **edit-only** fields (read on edit via `initialData`, written via PATCH). Hidden on create (defaults from schema). `isActive` checkbox stays.
- Parent picker filter adds `deletedAt: null` (already server-enforced, but visually clean).
- `typeLocked` logic (`accounts-form.tsx:53`) stays — type inherited from parent on create.

### 5.8 `components/account-picker.tsx` — `RhfAccountField`

The picker is used across the app (payments, expenses, invoice lines, FS slots). Currently: `selectable = node.isLeaf && node.account.isActive` (`accounts-tree.tsx:29`, where `isLeaf` is derived client-side as `children.length === 0`).

The notion of "leaf" becomes **`isPostable`**:
- `defaultSelectable` → `(node) => node.account.isPostable && node.account.isActive && !node.account.deletedAt`.
- For FS-slot pickers, additionally filter by `node.account.type === expectedTypeForSlot` (passed via a prop): `selectable={(node) => expectedType === node.account.type && node.account.isPostable && node.account.isActive}`. The FS screens already use the picker shape; the type filter is new — drives picker accuracy. Even without it, the server's `assertAccountFitsSlot` is the real guard.
- Visual: non-postable rows in the picker render dimmed with a "group" pill.

### 5.9 Types (`accounts.types.ts`)

```ts
interface AccountListItem {
  id, code, name, nameI18n, type, parentId, isActive,
  isPostable, isContra, deletedAt?
}
type AccountBalanceItem = AccountBalanceSummary // renamed/replaced
interface AccountBalanceSummary extends AccountListItem {
  parentCode, parentName,
  ownBalance, rolledBalance, childrenCount
}
```

The old `currentBalance` field on `AccountBalanceItem` (used at `accounts-page.tsx`, `accounts-tree.tsx`) — `use-account-balances.ts:39` mapped `rolledBalance` into `currentBalance` to feed inline tree balance display. After the rewrite: the manage tree's inline balance is removed (the manage surface is about hierarchy/CRUD, not balances — balances live in the balances panel). Keep the manage tree lean; balances panel is the source of truth for figures.

### 5.10 Module barrel (`hooks/index.ts`, `index.ts`)

Export the new hooks; drop `useAccountBalances` / `ACCOUNT_BALANCES_KEY`.

### 5.11 Local tests (`lib/*.test.ts`)

- `build-account-tree.test.ts` — update `AccountListItem` fixtures with `isPostable`/`isContra`/`deletedAt`.
- `account-balances.test.ts` — `buildChildrenIndex`/`getChildRows` no longer the contract; either delete the file (if fully removed) or test only the surviving small helpers (`hasChildren` becomes trivial).

### 5.12 Validate

```
pnpm turbo run build --filter=@devloggers/api-contracts
pnpm turbo run build --filter=@devloggers/api-client
pnpm turbo run build --filter=@devloggers/dashboard
pnpm turbo run build --filter=@devloggers/api
pnpm generate:dev
pnpm test
```

Dashboard never blocks the API-side work; Phase 3 can land in the same release or split — contracts are the seam.

---

## Roadmap (out of scope, recorded)

| Item | Where | Why now |
|---|---|---|
| Per-warehouse inventory/COGS/adjustment accounts | `Warehouse` module + financial-settings UI | Multi-warehouse tenants cannot value warehouses separately today. Schema + UI deserves its own spec. |
| Trial-balance / closing entries | `accounting/fiscal-periods/` + reporting | No `JournalLine` opening-balance primitive; period-close mechanics not modeled. Reporting-spec down the road. |
| Materialized-path / closure-table optimization | `ChartOfAccount` tree | For pathological tree depth (>5 levels). Current 3-level seeded chart is sub-second on Postgres with the new indexes; revisit when needed. |

---

## Risk register

| Risk | Mitigation |
|---|---|
| Forgotten call-site escapes the facade and posts a non-postable account | The `referenceType` enum sweep + `JournalLine` writing now requires going through `JournalPostingService.post` (no other path), and the facade's `assertLinesPostable` is the final guard. CI grep for `tx.journalEntry.create` outside the facade. |
| Old dashboard build still live in users' caches after the API drops `/account-balances` | Dev-only release; no production users. If a production release ever happens, deploy API + dashboard atomically. |
| Contra-account sign confusion in existing reports | Seeded `1220` is the only one in the default template; manual seed reset lets us fix it without backfill. Reports that read balances explicitly call `getAccountBalanceDelta` with `isContra`, so the sign is correct by construction. |
| Reversal-date = original entity date surprises a user who expects today's date on a void | Documented behavior; the `reversalDate` field is the explicit marker. Future enhancement: per-void reversal-date picker (out of scope). |
| Soft-deleted account's FK from `JournalLine` dangles | Deletion is forbidden when journal lines exist (`beforeDelete` guard); once deleted, the account had zero lines — no dangling rows. |

---

## Verification (per phase)

| Phase | Verification |
|---|---|
| 1 — schema + facade | `pnpm --filter @devloggers/db-prisma db:migrate:dev` succeeds; `JournalPostingService` unit tests pass (postable/period/balanced/contra); `getAccountBalanceDelta` flipped sign for `isContra=true`. |
| 2 — consumer sweep | All consumer spec files green; new cancel flows for stock-count + opening-balance; no `tx.journalEntry.create` reference outside `JournalPostingService`; `ReferenceType` enum used everywhere (grep `'invoice'` etc. no longer matches inside `apps/api/src/modules/`). |
| 3 — lazy balances API + dashboard | `pnpm turbo run build` across all four packages; dashboard initial page load issues one `/children-balances?parentId=ROOT` request, not the deleted `/account-balances`; drill-down fires one more request; breadcrumb hook chain-walks cheapest ancestor; `pnpm test` green. |
| 4 — reversal flows | `StockCountsService.cancel` reverses both stock movements and the GL entry; `InventoryService.cancelOpeningBalance` symmetric; `JournalEntry.reversalOfId`/`reversalDate` populated; ledger view shows reversal linked. |