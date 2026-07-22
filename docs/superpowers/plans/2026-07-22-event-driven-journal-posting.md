# Event-driven journal posting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all cross-module journal posting behind synchronous application posting requests (`emitAsync` + accounting listeners) so only accounting writes JEs, while keeping the same Prisma transaction.

**Architecture:** Domain services emit typed `*.journal.post.request` / `*.journal.cancel.request` payloads (including `tx` + business facts). One listener per request name, split by domain (`invoice`, `payment`, `expense`, `inventory`). Listeners enforce idempotency, resolve accounts, build lines, call private `JournalPostingService`.

**Tech Stack:** NestJS, `@nestjs/event-emitter`, Prisma interactive transactions, Jest

**Spec:** `docs/superpowers/specs/2026-07-22-event-driven-journal-posting-design.md`

## Global Constraints

- Same DB transaction: always `await emitAsync` inside open `$transaction`; never fire-and-forget `emit` for posting/cancel.
- Exactly one `@OnEvent` handler per request name; return `{ journalEntryId }` from handlers.
- Idempotency: one POSTED JE per `(tenantId, referenceType, referenceId)`; return existing id if present.
- Passing `tx` on the payload is Modular Monolith pragmatism (Outbox later if distributed).
- Do not export `JournalPostingService` from `AccountsModule` after migration.
- No Prisma schema changes. No product behavior changes for end users.
- Commits only if the user explicitly asks.

---

## File map

**Create**
- `apps/api/src/modules/accounting/accounts/utils/journal-idempotency.ts`
- `apps/api/src/modules/accounting/accounts/utils/journal-idempotency.spec.ts`
- `apps/api/src/modules/accounting/accounts/events/invoice-journal.events.ts`
- `apps/api/src/modules/accounting/accounts/events/payment-journal.events.ts`
- `apps/api/src/modules/accounting/accounts/events/expense-journal.events.ts`
- `apps/api/src/modules/accounting/accounts/events/inventory-journal.events.ts`
- `apps/api/src/modules/accounting/accounts/listeners/invoice-journal.listener.ts`
- `apps/api/src/modules/accounting/accounts/listeners/invoice-journal.listener.spec.ts`
- `apps/api/src/modules/accounting/accounts/listeners/payment-journal.listener.ts`
- `apps/api/src/modules/accounting/accounts/listeners/payment-journal.listener.spec.ts`
- `apps/api/src/modules/accounting/accounts/listeners/expense-journal.listener.ts`
- `apps/api/src/modules/accounting/accounts/listeners/expense-journal.listener.spec.ts`
- `apps/api/src/modules/accounting/accounts/listeners/inventory-journal.listener.ts`
- `apps/api/src/modules/accounting/accounts/listeners/inventory-journal.listener.spec.ts`
- `apps/api/src/modules/accounting/accounts/utils/invoice-journal.ts` (moved)
- `apps/api/src/modules/accounting/accounts/utils/payment-journal.ts` (moved)
- `apps/api/src/modules/accounting/accounts/utils/expense-journal.ts` (moved)
- Matching `*.spec.ts` moved beside builders

**Modify**
- `apps/api/src/modules/accounting/accounts/accounts.module.ts` — register listeners; import `DocumentSequencesModule`; stop exporting `JournalPostingService`
- `apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts` (+ specs)
- `apps/api/src/modules/invoicing/payments/payments.service.ts` (+ specs if any)
- `apps/api/src/modules/invoicing/expenses/expenses.service.ts`
- `apps/api/src/modules/inventory/inventory.service.ts` (+ opening specs)
- `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts` (+ specs)
- Feature modules: drop `AccountsModule` import when unused (`invoices`, `payments`, `expenses`, `inventory`, `stock-counts`)

**Delete** (after move)
- `apps/api/src/modules/invoicing/invoices/invoice-journal.ts` (+ spec)
- `apps/api/src/modules/invoicing/payments/payment-journal.ts`
- `apps/api/src/modules/invoicing/expenses/expense-journal.ts` (+ spec)

---

### Task 1: Idempotency helper

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/utils/journal-idempotency.ts`
- Create: `apps/api/src/modules/accounting/accounts/utils/journal-idempotency.spec.ts`

**Interfaces:**
- Produces: `findExistingPostedJournalEntry(tx, { tenantId, referenceType, referenceId }): Promise<{ id: string } | null>`

- [ ] **Step 1: Write failing test**

```ts
import { findExistingPostedJournalEntry } from './journal-idempotency';
import { ReferenceType } from '@devloggers/db-prisma';

describe('findExistingPostedJournalEntry', () => {
  it('returns id when a POSTED JE exists for the reference', async () => {
    const tx = {
      journalEntry: {
        findFirst: jest.fn().mockResolvedValue({ id: 'je-1' }),
      },
    };
    const result = await findExistingPostedJournalEntry(tx as any, {
      tenantId: 't1',
      referenceType: ReferenceType.INVOICE,
      referenceId: 'inv-1',
    });
    expect(result).toEqual({ id: 'je-1' });
    expect(tx.journalEntry.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        referenceType: ReferenceType.INVOICE,
        referenceId: 'inv-1',
        status: 'POSTED',
      },
      select: { id: true },
    });
  });

  it('returns null when none exists', async () => {
    const tx = { journalEntry: { findFirst: jest.fn().mockResolvedValue(null) } };
    const result = await findExistingPostedJournalEntry(tx as any, {
      tenantId: 't1',
      referenceType: ReferenceType.PAYMENT,
      referenceId: 'pay-1',
    });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @devloggers/api test -- journal-idempotency.spec.ts
```

- [ ] **Step 3: Implement helper**

```ts
import type { ReferenceType } from '@devloggers/db-prisma';

export async function findExistingPostedJournalEntry(
  tx: { journalEntry: { findFirst: (args: unknown) => Promise<{ id: string } | null> } },
  input: { tenantId: string; referenceType: ReferenceType; referenceId: string },
): Promise<{ id: string } | null> {
  return tx.journalEntry.findFirst({
    where: {
      tenantId: input.tenantId,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      status: 'POSTED',
    },
    select: { id: true },
  });
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @devloggers/api test -- journal-idempotency.spec.ts
```

---

### Task 2: Move journal line builders into accounting

**Files:**
- Create (move): `accounts/utils/expense-journal.ts`, `invoice-journal.ts`, `payment-journal.ts` (+ specs)
- Delete old invoicing copies after imports updated
- Fix any import of `JournalLineInput` / builders

**Interfaces:**
- Produces: same exported functions/types as today, under `accounts/utils/`
- `invoice-journal.ts` and `payment-journal.ts` import `JournalLineInput` from `./expense-journal`

- [ ] **Step 1: Move files** — copy content; update relative imports inside builders to `./expense-journal` and `../services/journal-posting.service` where needed (inventory-journal already correct).

- [ ] **Step 2: Temporarily re-export from old paths** (optional, one commit window) OR update all imports in one go:

```ts
// OLD invoicing paths deleted; update:
// invoice-posting.service.ts — remove builder imports (Task 5)
// payments.service.ts — remove
// expenses.service.ts — remove
// Specs that import builders — point to accounts/utils/
```

- [ ] **Step 3: Run builder specs**

```bash
pnpm --filter @devloggers/api test -- invoice-journal.spec.ts
pnpm --filter @devloggers/api test -- expense-journal.spec.ts
pnpm --filter @devloggers/api test -- inventory-journal.spec.ts
```

Expected: PASS

---

### Task 3: Request event classes

**Files:**
- Create: `events/invoice-journal.events.ts`
- Create: `events/payment-journal.events.ts`
- Create: `events/expense-journal.events.ts`
- Create: `events/inventory-journal.events.ts`

**Interfaces:**
- Each class: `static readonly NAME`, constructor fields including `tx: any`, `tenantId`, `userId`, plus domain facts from the spec table.
- Inventory opening includes `operationId: string` (uuid) used as JE `referenceId`.

- [ ] **Step 1: Implement invoice events**

```ts
/** Synchronous application posting request — not a traditional domain event. */
export class InvoiceJournalPostRequest {
  static readonly NAME = 'invoice.journal.post.request';
  constructor(
    public readonly tx: any,
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly invoiceId: string,
    public readonly direction: 'PURCHASE' | 'SALE',
    public readonly number: string,
    public readonly date: Date,
    public readonly fiscalPeriodId: string,
    public readonly fiscalPeriodStatus: string | undefined,
    public readonly exchangeRate: number,
    public readonly partyId: string,
    public readonly netAmount: number,
    public readonly taxAmount: number,
    public readonly total: number,
    public readonly inventoryAmount?: number,
    public readonly cogsTotal?: number,
  ) {}
}

export class InvoiceJournalCancelRequest {
  static readonly NAME = 'invoice.journal.cancel.request';
  constructor(
    public readonly tx: any,
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly invoiceId: string,
    public readonly number: string,
    public readonly originalJournalEntryId: string,
    public readonly date: Date,
    public readonly fiscalPeriodId: string,
    public readonly fiscalPeriodStatus: string | undefined,
    public readonly exchangeRate: number,
  ) {}
}
```

- [ ] **Step 2: Implement payment / expense / inventory events** mirroring the spec table (`payment.journal.post.request`, `payment.journal.cancel.request`, `expense.journal.post.request`, `expense.journal.cancel.request`, `inventory.opening-balance.journal.post.request`, `stock-count.journal.post.request`).

Expense post request items shape:

```ts
items: Array<{ accountId: string; amount: number; description: string; sortOrder: number }>
```

Inventory opening:

```ts
export class InventoryOpeningBalanceJournalPostRequest {
  static readonly NAME = 'inventory.opening-balance.journal.post.request';
  constructor(
    public readonly tx: any,
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly warehouseId: string,
    public readonly operationId: string,
    public readonly fiscalPeriodId: string,
    public readonly fiscalPeriodStatus: string | undefined,
    public readonly totalValue: number,
  ) {}
}
```

---

### Task 4: Invoice journal listener

**Files:**
- Create: `listeners/invoice-journal.listener.ts`
- Create: `listeners/invoice-journal.listener.spec.ts`
- Modify: `accounts.module.ts` — add listener + `DocumentSequencesModule` import

**Interfaces:**
- Consumes: `InvoiceJournalPostRequest` / `CancelRequest`, `JournalPostingService`, `DocumentSequencesService`, `FinancialSettingsService`, `PrismaService` (party account overrides), `findExistingPostedJournalEntry`, `buildInvoiceJournalLines`, `buildCogsJournalLines`
- Produces: handler return `{ journalEntryId: string }`

- [ ] **Step 1: Failing listener tests** — post SALE builds revenue lines + optional COGS; post is idempotent when JE exists; cancel calls `reverse` with `INVOICE_CANCELLATION`.

```ts
it('returns existing journalEntryId when already posted (idempotent)', async () => {
  const tx = { journalEntry: { findFirst: jest.fn().mockResolvedValue({ id: 'je-existing' }) } };
  // ... wire listener with mocks
  const result = await listener.onPost(new InvoiceJournalPostRequest(tx, 't1', 'u1', /* ... */));
  expect(result).toEqual({ journalEntryId: 'je-existing' });
  expect(journalPosting.post).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Implement listener**

```ts
@Injectable()
export class InvoiceJournalListener {
  constructor(
    private readonly journalPosting: JournalPostingService,
    private readonly docSeq: DocumentSequencesService,
    private readonly financialSettings: FinancialSettingsService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(InvoiceJournalPostRequest.NAME)
  async onPost(req: InvoiceJournalPostRequest): Promise<{ journalEntryId: string }> {
    const existing = await findExistingPostedJournalEntry(req.tx, {
      tenantId: req.tenantId,
      referenceType: ReferenceType.INVOICE,
      referenceId: req.invoiceId,
    });
    if (existing) return { journalEntryId: existing.id };

    const settings = await this.financialSettings.getOrThrow(req.tenantId);
    const party = await this.prisma.party.findFirst({
      where: { id: req.partyId, tenantId: req.tenantId },
      select: { receivableAccountId: true, payableAccountId: true },
    });
    // Resolve accounts; throw BadRequestException with same messages as today when missing.
    // Build lines via buildInvoiceJournalLines + optional buildCogsJournalLines when cogsTotal > 0.
    const number = await this.docSeq.getNextNumber(req.tenantId, 'JOURNAL_ENTRY');
    const entry = await this.journalPosting.post(req.tx, { /* PostInput */ });
    return { journalEntryId: entry.id };
  }

  @OnEvent(InvoiceJournalCancelRequest.NAME)
  async onCancel(req: InvoiceJournalCancelRequest): Promise<{ journalEntryId: string }> {
    const existing = await findExistingPostedJournalEntry(req.tx, {
      tenantId: req.tenantId,
      referenceType: ReferenceType.INVOICE_CANCELLATION,
      referenceId: req.invoiceId,
    });
    if (existing) return { journalEntryId: existing.id };
    const number = await this.docSeq.getNextNumber(req.tenantId, 'JOURNAL_ENTRY');
    const entry = await this.journalPosting.reverse(req.tx, { /* ReverseInput */ });
    return { journalEntryId: entry.id };
  }
}
```

Copy account-resolution / error messages from current `invoice-posting.service.ts` into the listener.

- [ ] **Step 3: Register in `AccountsModule`**

```ts
imports: [FinancialSettingsModule, DocumentSequencesModule],
providers: [ /* existing */, InvoiceJournalListener ],
exports: [AccountsService], // drop JournalPostingService only after all call sites migrated — or drop at Task 9
```

- [ ] **Step 4: Run listener specs**

```bash
pnpm --filter @devloggers/api test -- invoice-journal.listener.spec.ts
```

---

### Task 5: Migrate `InvoicePostingService`

**Files:**
- Modify: `invoice-posting.service.ts`
- Modify: `invoice-posting.service.spec.ts`, `invoice-posting.perpetual.spec.ts`
- Modify: `invoices.module.ts` — remove `AccountsModule` when unused

**Interfaces:**
- Consumes: `EventEmitter2`, request classes from Task 3
- Stops consuming: `JournalPostingService`, JE `DocumentSequencesService` (keep `FinancialSettingsService` for fail-fast before stock work)

- [ ] **Step 1: Update cancel spec** to expect `emitAsync(InvoiceJournalCancelRequest.NAME, …)` instead of `journalPosting.reverse`.

- [ ] **Step 2: Replace JE calls in purchase/sales/cancel**

Inside `$transaction`, after stock movements (and after computing `cogsTotal` / `inventoryAmount`):

```ts
const [je] = await this.eventEmitter.emitAsync(
  InvoiceJournalPostRequest.NAME,
  new InvoiceJournalPostRequest(
    tx,
    tenantId,
    userId,
    invoice.id,
    'SALE', // or PURCHASE
    invoice.number,
    invoice.date,
    invoice.fiscalPeriodId,
    invoice.fiscalPeriod?.status,
    exchangeRate,
    invoice.partyId,
    netAmount,
    Number(invoice.taxAmount),
    Number(invoice.total),
    inventoryAmount, // purchase only
    cogsTotal,       // sale only
  ),
);
// je.journalEntryId available if needed; invoices today do not store it
```

Cancel:

```ts
await this.eventEmitter.emitAsync(
  InvoiceJournalCancelRequest.NAME,
  new InvoiceJournalCancelRequest(tx, tenantId, userId, invoice.id, invoice.number, original.id, invoice.date, invoice.fiscalPeriodId, invoice.fiscalPeriod?.status, exchangeRate),
);
```

Remove: `buildInvoiceJournalLines`, `buildCogsJournalLines`, `journalPosting`, pre-tx `getNextNumber` for JE.

Keep: fail-fast `financialSettingsService.getOrThrow` + missing-account checks before entering stock loops (same messages).

- [ ] **Step 3: Constructor inject `EventEmitter2` instead of `JournalPostingService`**

- [ ] **Step 4: Run invoice specs**

```bash
pnpm --filter @devloggers/api test -- invoice-posting
```

Expected: PASS

---

### Task 6: Payment listener + migrate `PaymentsService`

**Files:**
- Create: `listeners/payment-journal.listener.ts` (+ spec)
- Modify: `payments.service.ts`
- Modify: `payments.module.ts` — drop `AccountsModule`
- Register `PaymentJournalListener` in `AccountsModule`

**Interfaces:**
- Post request → resolve cashbox `linkedAccountId` + AR/AP from party/FS → `buildPaymentJournalLines` → `post`
- Cancel → idempotent `PAYMENT_CANCELLATION` → `reverse`

- [ ] **Step 1: Listener tests** (idempotent + correct `ReferenceType.PAYMENT`)

- [ ] **Step 2: Implement `PaymentJournalListener`** — move account resolution currently in `payments.service.ts` `post()` into the listener.

- [ ] **Step 3: Migrate `PaymentsService.post` / `cancel`**

```ts
await this.eventEmitter.emitAsync(
  PaymentJournalPostRequest.NAME,
  new PaymentJournalPostRequest(tx, tenantId, userId, payment.id, payment.number, payment.type, amount, exchangeRate, payment.date, payment.fiscalPeriodId, payment.fiscalPeriod?.status, payment.cashboxId, payment.partyId ?? null),
);
await tx.cashbox.update(/* ... */);
await tx.payment.update({ data: { status: 'POSTED', ... } });
```

Domain keeps: draft/posted guards, cashbox linked-account fail-fast, original JE lookup for cancel (to pass `originalJournalEntryId`).

- [ ] **Step 4: Verify**

```bash
pnpm --filter @devloggers/api test -- payment
```

---

### Task 7: Expense listener + migrate `ExpensesService`

**Files:**
- Create: `listeners/expense-journal.listener.ts` (+ spec)
- Modify: `expenses.service.ts`
- Modify: `expenses.module.ts` — drop `AccountsModule`

**Interfaces:**
- Post returns `{ journalEntryId }` — domain writes `journalEntryId` on expense
- Move `assertAccountFitsSlot` checks into listener

- [ ] **Step 1: Listener tests** including idempotency and slot validation failure

- [ ] **Step 2: Implement listener** — build lines with `buildExpenseJournalLines` using request items (amounts already × exchangeRate in domain or compute in listener consistently with today: today multiplies in domain before build — **keep multiplying in domain** and pass base amounts on the request, matching current `expenses.service.ts`).

- [ ] **Step 3: Migrate post/cancel**

```ts
const [je] = await this.eventEmitter.emitAsync(
  ExpenseJournalPostRequest.NAME,
  new ExpenseJournalPostRequest(/* tx + facts + items */),
);
await tx.cashbox.update({ data: { balance: { decrement: totalAmount } } });
await tx.expense.update({
  where: { id },
  data: { status: 'POSTED', postedAt: new Date(), postedBy: userId, journalEntryId: je.journalEntryId },
});
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter @devloggers/api test -- expense
```

---

### Task 8: Inventory listener + migrate inventory opening & stock counts

**Files:**
- Create: `listeners/inventory-journal.listener.ts` (+ spec)
- Modify: `inventory.service.ts`, `inventory.opening.spec.ts`
- Modify: `stock-counts.service.ts`, `stock-counts.service.spec.ts`
- Modify: `inventory.module.ts`, `stock-counts.module.ts` — drop `AccountsModule`
- Register `InventoryJournalListener` in `AccountsModule`

**Interfaces:**
- Opening: `operationId = randomUUID()`; `referenceId = operationId`; return `journalEntryId`
- Stock count: emit only if `netVariance !== 0`

- [ ] **Step 1: Listener tests** — opening uses `buildOpeningBalanceLines`; stock-count uses `buildStockCountVarianceLines`; both idempotent

- [ ] **Step 2: Implement `InventoryJournalListener`** with two `@OnEvent` methods

- [ ] **Step 3: Migrate `registerOpeningBalance`**

```ts
import { randomUUID } from 'crypto';

const operationId = randomUUID();
// ... stock movements ...
if (totalValue !== 0) {
  const [je] = await this.eventEmitter.emitAsync(
    InventoryOpeningBalanceJournalPostRequest.NAME,
    new InventoryOpeningBalanceJournalPostRequest(
      tx, tenantId, userId, dto.warehouseId, operationId, dto.fiscalPeriodId, period?.status, totalValue,
    ),
  );
  journalEntryId = je.journalEntryId;
}
return { count: dto.items.length, warehouseId: dto.warehouseId, journalEntryId };
```

- [ ] **Step 4: Migrate stock-count post** — remove `buildStockCountVarianceLines` + `journalPosting`; emit `StockCountJournalPostRequest` when `netVariance !== 0`. Keep existing `StockCountPostedEvent` emit after success (CRUD-style domain event — unchanged).

- [ ] **Step 5: Verify**

```bash
pnpm --filter @devloggers/api test -- inventory.opening
pnpm --filter @devloggers/api test -- stock-counts.service
```

---

### Task 9: Seal `AccountsModule` exports + final sweep

**Files:**
- Modify: `accounts.module.ts` — `exports: [AccountsService]` only (no `JournalPostingService`)
- Grep for remaining imports of `JournalPostingService` / old journal builders outside accounting

- [ ] **Step 1: Grep**

```bash
rg "JournalPostingService|buildInvoiceJournalLines|buildPaymentJournalLines|buildExpenseJournalLines|from '\\./invoice-journal'|from '\\./payment-journal'|from '\\./expense-journal'" apps/api/src
```

Expected: matches only under `accounting/accounts/` (plus opening-balances direct use of `JournalPostingService`).

- [ ] **Step 2: Ensure all four listeners registered**

```ts
providers: [
  // ...
  JournalPostingService,
  InvoiceJournalListener,
  PaymentJournalListener,
  ExpenseJournalListener,
  InventoryJournalListener,
],
exports: [AccountsService],
```

- [ ] **Step 3: Build**

```bash
pnpm turbo run build --filter=@devloggers/api
```

Expected: PASS

---

### Task 10: Final verification

- [ ] **Step 1: Run accounting + invoicing + inventory related tests**

```bash
pnpm --filter @devloggers/api test -- journal-idempotency
pnpm --filter @devloggers/api test -- journal-posting.service
pnpm --filter @devloggers/api test -- invoice-journal
pnpm --filter @devloggers/api test -- invoice-posting
pnpm --filter @devloggers/api test -- payment
pnpm --filter @devloggers/api test -- expense
pnpm --filter @devloggers/api test -- inventory
pnpm --filter @devloggers/api test -- stock-count
```

- [ ] **Step 2: Manual smoke** (local API)
  - Post + cancel sales invoice (with stock/COGS) and purchase invoice
  - Post + cancel payment and expense (confirm `journalEntryId` on expense)
  - Post stock count with non-zero variance
  - Register inventory opening balance (confirm returned `journalEntryId`)
  - Force a listener failure (e.g. missing FS account) and confirm document stays DRAFT / tx rolls back

- [ ] **Step 3: Spec checklist**
  - [ ] No non-accounting `JournalPostingService` imports
  - [ ] Not exported from `AccountsModule`
  - [ ] Request names use `*.journal.post.request` / `*.journal.cancel.request`
  - [ ] Listeners split by domain
  - [ ] Idempotency covered by tests
  - [ ] `tx` still passed on request payload

---

## Follow-ups (post-merge / out of scope)

- [ ] Unique DB index on `(tenant_id, reference_type, reference_id)` where status=POSTED (stronger than app-level idempotency)
- [ ] Outbox Pattern if services are split across processes
- [ ] Stock-count / inventory-opening cancellation flows (already noted in older accounting specs)
