# Event-driven journal posting — Design

- **Status:** Approved
- **Date:** 2026-07-22
- **Scope:** NestJS API only — decouple cross-module `JournalPostingService` usage into `@nestjs/event-emitter` synchronous posting **requests** handled inside accounting
- **Out of scope:** Outbox / async queues; two-phase `POSTING` status; changing perpetual inventory accounting rules; manual JE / transfer / cashbox-adjustment flows; moving `OpeningBalancesService` onto events (same module — keep direct call)

## Decisions (locked during brainstorming)

| Area | Decision |
|---|---|
| Event kind | **Synchronous application posting requests** — not traditional after-the-fact domain events. Names use `*.journal.post.request` / `*.journal.cancel.request`. Exactly **one** listener per name; `emitAsync` return values are intentional. |
| Transactionality | **Same Prisma `$transaction`** — domain `await emitAsync` inside open `tx`; listener failure rolls back domain + GL |
| Event content | **Business facts** — domain emits amounts/refs; accounting resolves accounts, builds lines, posts JE |
| `tx` propagation | **Pass `tx` on the event payload** (pragmatic Modular Monolith choice; replace with **Outbox** if/when distributed) |
| Structure | **Typed per-document request events + listeners split by domain** (`invoice`, `payment`, `expense`, `inventory`) |
| Transport | **`@nestjs/event-emitter`** (`EventEmitter2.emitAsync`) — already global in `app.module.ts` |
| Idempotency | **One POSTED JE per `(tenantId, referenceType, referenceId)`** — listener returns existing id if already posted; same for cancel refs |
| JE number | **Listener owns** `DocumentSequencesService.getNextNumber(..., 'JOURNAL_ENTRY')` |
| Module export | **`JournalPostingService` stops being exported** from `AccountsModule` |
| Opening balances (CoA) | **Direct** `JournalPostingService` call inside accounting module |

## Problem

Today invoicing and inventory modules import `AccountsModule` solely to inject `JournalPostingService` and call `.post(tx)` / `.reverse(tx)` inside their transactions. Journal line builders live beside domain services (`invoice-journal.ts`, `payment-journal.ts`, `expense-journal.ts`) while inventory builders already sit under accounting (`inventory-journal.ts`).

That couples every posting feature to the GL engine and Chart of Accounts validation surface, and makes “who may write journal entries” unclear.

**Call sites to migrate:**

| File | Operations |
|---|---|
| `invoicing/invoices/invoice-posting.service.ts` | post purchase/sales + cancel reverse |
| `invoicing/payments/payments.service.ts` | post + cancel reverse |
| `invoicing/expenses/expenses.service.ts` | post + cancel reverse (stores `journalEntryId`) |
| `inventory/inventory.service.ts` | opening-balance post (returns `journalEntryId`) |
| `inventory/stock-counts/stock-counts.service.ts` | variance post when `netVariance !== 0` |

`accounting/accounts/services/opening-balances.service.ts` already lives in accounting — **no event required**.

## Architecture

These are **synchronous application posting requests** (in-process command-style callbacks), not traditional domain events. They exist to keep GL writes inside accounting while preserving one DB transaction. Passing Prisma `tx` on the payload is an accepted Modular Monolith trade-off; a future distributed split would replace this with an Outbox (or equivalent) and drop `tx` from the payload.

```
Domain service                    EventEmitter2                 Accounting (one listener)
─────────────                     ─────────────                 ────────────────────────
$transaction(tx) ──┐
  domain work      │
  emitAsync(Req) ──┼─────────────► @OnEvent (exactly one handler)
                   │                 idempotency check
                   │                 resolve FS / party / cashbox accounts
                   │                 build*JournalLines(...)
                   │                 JournalPostingService.post|reverse(tx)
                   │◄── returns [{ journalEntryId }]
  continue / commit┘
```

**Rules:**

1. Only accounting writes `JournalEntry` / `JournalLine` (via `JournalPostingService`).
2. Domain never imports `JournalPostingService` or journal line builders.
3. Posting/cancellation always uses `emitAsync` (never fire-and-forget `emit`).
4. Domain may still compute **domain amounts** that only it knows inside the tx (e.g. `cogsTotal`, `netVariance`, inventory capitalization) and put those on the request — never debit/credit line arrays.
5. **Exactly one** `@OnEvent` handler per request name. Return values are part of the contract (`const [result] = await emitAsync(...)`).
6. **Idempotency:** before `post`/`reverse`, if a `POSTED` JE already exists for `(tenantId, referenceType, referenceId)`, return `{ journalEntryId: existing.id }` and do not create another.

### Module boundaries after refactor

| Module | Keeps | Removes |
|---|---|---|
| Invoices / Payments / Expenses / Inventory / Stock-counts | Domain posting side effects; emit posting/cancellation events | `AccountsModule` import for JE; `JournalPostingService`; local `*-journal.ts` builders |
| `AccountsModule` | Private `JournalPostingService`; moved builders; posting listeners; `DocumentSequencesModule` if needed for JE numbers | Export of `JournalPostingService` |

## Application posting requests & payloads

**Kind:** Synchronous application posting requests (not CRUD/domain lifecycle events).

**Naming:** `{domain}.journal.post.request` / `{domain}.journal.cancel.request`.

Each request carries at least: `tx`, `tenantId`, `userId`, plus the facts below. `tx` is the Prisma interactive-transaction client (same pragmatic typing as today).

| Request name | Emitter | Key business facts | Idempotency `referenceType` / `referenceId` |
|---|---|---|---|
| `invoice.journal.post.request` | `InvoicePostingService` | `invoiceId`, `direction` (`PURCHASE` \| `SALE`), `number`, `date`, `fiscalPeriodId`, `fiscalPeriodStatus`, `exchangeRate`, `partyId`, `netAmount`, `taxAmount`, `total`, optional `inventoryAmount`, optional `cogsTotal` | `INVOICE` / `invoiceId` |
| `invoice.journal.cancel.request` | `InvoicePostingService` | `invoiceId`, `number`, `originalJournalEntryId`, `date`, `fiscalPeriodId`, `fiscalPeriodStatus`, `exchangeRate` | `INVOICE_CANCELLATION` / `invoiceId` |
| `payment.journal.post.request` | `PaymentsService` | `paymentId`, `number`, `type`, `amount`, `exchangeRate`, `date`, `fiscalPeriodId`, `fiscalPeriodStatus`, `cashboxId`, `partyId` | `PAYMENT` / `paymentId` |
| `payment.journal.cancel.request` | `PaymentsService` | `paymentId`, `number`, `originalJournalEntryId`, `type`, `amount`, `exchangeRate`, `date`, `fiscalPeriodId`, `fiscalPeriodStatus`, `cashboxId` | `PAYMENT_CANCELLATION` / `paymentId` |
| `expense.journal.post.request` | `ExpensesService` | `expenseId`, `number`, `date`, `fiscalPeriodId`, `fiscalPeriodStatus`, `exchangeRate`, `totalAmount`, `cashboxId`, item rows (`accountId`, `amount`, `description`, `sortOrder`) | `EXPENSE` / `expenseId` |
| `expense.journal.cancel.request` | `ExpensesService` | `expenseId`, `number`, `originalJournalEntryId`, `date`, `fiscalPeriodId`, `fiscalPeriodStatus`, `exchangeRate`, `totalAmount`, `cashboxId` | `EXPENSE_CANCELLATION` / `expenseId` |
| `inventory.opening-balance.journal.post.request` | `InventoryService` | `warehouseId`, `fiscalPeriodId`, `fiscalPeriodStatus`, `totalValue`, `operationId` (uuid per register call — used as `referenceId`) | `OPENING_BALANCE` / `operationId` |
| `stock-count.journal.post.request` | `StockCountsService` | `stockCountId`, `number`, `fiscalPeriodId`, `fiscalPeriodStatus`, `netVariance` (skip emit when `netVariance === 0`) | `STOCK_COUNT` / `stockCountId` |

### Listener responsibilities

For each **post** request:

1. **Idempotency:** `findFirst` POSTED JE for `(tenantId, referenceType, referenceId)`. If found, return `{ journalEntryId }` immediately.
2. Resolve GL accounts **in the listener** from Financial Settings, party overrides, and cashbox `linkedAccountId` (not in domain). Use request `tx` for reads that must see uncommitted rows; otherwise the normal Prisma client is fine for settings.
3. Allocate JE number via `DocumentSequencesService` (same “consume number even if later rollback” behavior as today’s pre-tx allocation is acceptable).
4. Build lines with the moved pure helpers.
5. Call `JournalPostingService.post(tx, PostInput)`.
6. Return `{ journalEntryId }` so domain can persist it (expenses) or return it (inventory opening).

Note: expense line `accountId`s are user-selected on the document — they travel as business facts; the listener still validates postability/type via `JournalPostingService` / account-slot checks.

For each **cancel** request:

1. **Idempotency:** if a POSTED JE already exists for the cancellation `(referenceType, referenceId)`, return its id.
2. Allocate JE number.
3. Call `JournalPostingService.reverse(tx, ReverseInput)` with `originalEntryId` from the payload.
4. Return `{ journalEntryId }`.

### File layout (accounting)

```
apps/api/src/modules/accounting/accounts/
  events/
    invoice-journal.events.ts
    payment-journal.events.ts
    expense-journal.events.ts
    inventory-journal.events.ts      # opening-balance + stock-count requests
  listeners/
    invoice-journal.listener.ts
    payment-journal.listener.ts
    expense-journal.listener.ts
    inventory-journal.listener.ts    # opening-balance + stock-count handlers
  utils/invoice-journal.ts           # moved from invoicing
  utils/payment-journal.ts           # moved
  utils/expense-journal.ts           # moved
  utils/inventory-journal.ts         # already here
  utils/journal-idempotency.ts       # shared findExistingPostedJe(tx, ...)
  services/journal-posting.service.ts
```

Register all four listeners as providers in `AccountsModule`. Import `DocumentSequencesModule` and `FinancialSettingsModule` as needed.

## Domain service changes (behavioral)

Inside each existing `$transaction`:

1. Perform domain mutations that must precede GL facts (especially stock movements for perpetual COGS / variance). Cashbox balance updates may run before or after `emitAsync` as long as they stay in the same `tx`.
2. `await emitAsync(...)` for GL.
3. Update document status (and `journalEntryId` when applicable) using the listener return value when needed. Status flips always stay after a successful emit.

**Pre-flight guards** (draft-only, stock availability, empty lines, cashbox linked account, etc.) stay in domain.

**GL validation** (postable accounts, balance, fiscal period on the JE itself) stays in `JournalPostingService` / listener. Expense account-slot checks that are purely GL should move into the expense posting listener so CoA rules live in accounting.

Domain services inject `EventEmitter2` instead of `JournalPostingService`. Remove `AccountsModule` from invoicing/inventory feature modules’ `imports` once unused.

## Error handling & integrity

- Listener throw → `emitAsync` rejects → Prisma transaction rolls back → no orphan `POSTED` documents without JE (and vice versa).
- Missing Financial Settings / linked accounts: listener throws `BadRequestException` with the same user-facing messages used today.
- Do not emit posting requests outside a transaction.
- Do not use fire-and-forget `emit` for these flows.
- Duplicate post/cancel for the same document must not create a second JE (idempotent return of existing id).

## Testing

| Layer | Change |
|---|---|
| Journal builder specs | Move with the files; paths under `accounts/utils/` |
| Domain posting specs | Assert `emitAsync` was called with correct request name + business facts; stop mocking `JournalPostingService` |
| Listener specs (new, per domain) | Fact payload + mock `tx` → correct `post`/`reverse` input; second call returns existing id |
| Idempotency helper specs | Existing JE found → return id; missing → null |
| Existing `JournalPostingService` specs | Unchanged |

Manual smoke: post + cancel invoice (sale with COGS, purchase with inventory), payment, expense; stock-count with non-zero variance; inventory opening balance — verify JE rows and rollback on forced listener failure.

## Migration / rollout

Single PR / vertical slice — no feature flag. Behavior for end users unchanged (same JEs, same statuses). No Prisma schema changes.

## Success criteria

1. No non-accounting module imports `JournalPostingService` or journal line builders.
2. `AccountsModule` does not export `JournalPostingService`.
3. All former call sites post/reverse only via `emitAsync` + accounting listeners (except in-module opening balances).
4. Existing posting/cancellation semantics and ACID guarantees preserved.
5. Idempotent: double post/cancel for the same reference does not create duplicate JEs.
6. Listeners are split by domain (no single god listener file).
7. Relevant unit specs updated and passing.
