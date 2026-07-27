# Phase 1 — GL Posting Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove GL account-resolution and journal-line-construction logic from six non-accounting services and move it behind a single `AccountingPostingFacade`, so accounting owns all GL policy and no other module can decide what an account is.

**Architecture:** Non-accounting services (`invoice-posting`, `payments`, `expenses`, `stock-counts`, `inventory`, and — for uniformity — `opening-balances` inside accounting itself) build a typed `PostingIntent` describing what happened economically and hand it to `AccountingPostingFacade.record()` / `.reverse()`. The facade resolves a policy from `PostingPolicyRegistry`, has it build balanced journal lines (or, for reversals, simply mirrors the original entry), allocates the JE number, and persists via the existing `JournalPostingService`. Everything runs synchronously inside the caller's own `$transaction`.

**Tech Stack:** NestJS 4-layer modules, Prisma (`Prisma.TransactionClient`), Jest, the Phase 0 golden-master harness (`apps/api/src/modules/accounting/posting/__tests__/golden-master.{harness,spec}.ts`).

## Global Constraints

- **Behaviour-preserving by construction.** Every existing golden-master `toEqual` expectation in `golden-master.spec.ts` must still pass unmodified after every task — do not edit its expectations, only its fixture-builder plumbing (Task 17).
- **No `accountId` field on a `PostingIntent`** for GL accounts that are *resolved* by policy (settings + party override). Two intents carry `accountId` as **direct user input** instead (documented exception, see Task 8 and Task 6) — this is a deliberate, reasoned deviation from spec rule 1.1.3, not an oversight.
- **No new casts.** Fixing `noUncheckedIndexedAccess`/`strict` issues must be done at the source, per `.ai/rules/code-quality.md` §4 and Phase 0.4.
- **Every task ends with:** `pnpm --filter @devloggers/api exec tsc --noEmit` clean and `pnpm --filter @devloggers/api test` green (golden masters included).
- **Never fix an accounting bug found along the way inside this phase** — log it (this plan's own "Q2 log" section at the bottom) and stop. Two are already known and logged there from the design pass; do not silently resolve them differently than documented.

## Deviations from the phase spec (read before executing)

The source spec is `docs/superpowers/specs/2026-07-25-architecture-refactor/phase-1-gl-posting-port.md`. Three deliberate reorderings/decisions were made while turning it into bite-sized tasks — each is safe, evidenced, and documented here so a reviewer isn't surprised:

1. **Policies (spec task 1.4) are implemented *before* the facade + registry (spec task 1.3), not after.** The registry's whole job is to dispatch to concrete policy instances, so it cannot compile until they exist. Task order below is: contracts → typed transaction → all 7 policies (each independently unit-testable, no facade dependency) → facade + registry + module → call-site migrations → boundary lint.
2. **Facade step order is `assertFiscalPeriodOpen` → policy builds lines → `getNextNumber` → `JournalPostingService.post`**, not "policy builds lines → assertFiscalPeriodOpen → …" as literally written in the spec. Every one of the 10 original call sites checks the fiscal period *before* doing any GL work, and checks it *before* consuming a document-sequence number. Swapping period-check first preserves that fail-fast order exactly and avoids burning a JE number on a period-closed rejection. `JournalPostingService.post`/`.reverse` already re-check the period internally (defense in depth, unchanged) and already assert the balance — the facade does not duplicate that assertion a second time (spec step "assert balanced" is redundant with existing code and is dropped to avoid two near-identical checks).
3. **The five `*_CANCELLATION` `ReferenceType` enum members are exercised by only three real call sites** (invoice, payment, expense — matching the three cancellation `describe` blocks already in `golden-master.spec.ts`). `STOCK_COUNT_CANCELLATION` and `OPENING_BALANCE_CANCELLATION` exist in the schema but nothing in the codebase posts them today; Phase 1 does not add that behaviour. The spec's "six `*_CANCELLATION` types" in task 1.3.3 appears to be an off-by-one against the schema — treat "three" as the accurate, measured number (`packages/db-prisma/src/schema/accounting.prisma:17-28`).

---

## Task 1: Posting contracts

**Files:**
- Create: `apps/api/src/modules/accounting/posting/contracts/prisma-tx.ts`
- Create: `apps/api/src/modules/accounting/posting/contracts/journal-line-draft.ts`
- Create: `apps/api/src/modules/accounting/posting/contracts/posting-intent.ts`

**Interfaces:**
- Produces: `PrismaTransactionClient`, `JournalLineDraft`, `PostingIntent`, `PostingRecordIntent`, `PostingCancellationIntent`, and each named intent member (`InvoicePostedIntent`, `InvoiceCancelledIntent`, `PaymentRecordedIntent`, `PaymentCancelledIntent`, `ExpenseRecordedIntent`, `ExpenseCancelledIntent`, `StockCountAdjustedIntent`, `OpeningBalancePostedIntent`, `OpeningStockPostedIntent`) — every later task imports from these three files.

- [ ] **Step 1: Create `prisma-tx.ts`**

```ts
import type { Prisma } from '@devloggers/db-prisma';

/**
 * The Prisma interactive-transaction client type. Replaces the `tx: any` that
 * let a typo'd intent field or a dropped account id compile silently (F2) —
 * see docs/superpowers/specs/2026-07-25-architecture-refactor/00-findings.md#f2.
 */
export type PrismaTransactionClient = Prisma.TransactionClient;
```

- [ ] **Step 2: Create `journal-line-draft.ts`**

```ts
/** A single balanced-entry line a policy hands back to the facade. */
export interface JournalLineDraft {
    accountId: string;
    debit: number;
    credit: number;
    description: string | null;
    sortOrder: number;
    partyId?: string | null;
}
```

- [ ] **Step 3: Create `posting-intent.ts`**

```ts
/**
 * Discriminated union of every economic event a non-accounting module can
 * report to `AccountingPostingFacade`. Fields describe *what happened*
 * (amounts, quantities, party, direction) — never which GL account it hits.
 *
 * Two exceptions carry an `accountId`, by deliberate design, not oversight:
 * `ExpenseRecordedIntent.items[].accountId` and
 * `OpeningBalancePostedIntent.entries[].accountId`. In both cases the account
 * is direct user input at the API boundary (the DTO already carries it) —
 * there is no fallback/override resolution logic to move into a policy, only
 * validation. See Task 6 and Task 8 for the full reasoning.
 */
export interface PostingIntentBase {
    tenantId: string;
    userId: string;
    /** Also used as the reversal date for cancellation intents. */
    date: Date;
    fiscalPeriodId: string;
    fiscalPeriodStatus: string | undefined;
    exchangeRate: number;
    /** The id of the domain entity this posting is about (invoice id, payment id, …). */
    referenceId: string;
    description: string;
}

export interface InvoicePostedIntent extends PostingIntentBase {
    kind: 'INVOICE_POSTED';
    direction: 'PURCHASE' | 'SALE';
    partyId: string;
    /** subtotal - discountAmount, invoice currency. */
    netAmount: number;
    taxAmount: number;
    total: number;
    /** PURCHASE only: stock-line net (tax-exclusive) capitalised to Inventory. */
    inventoryAmount?: number;
    /** SALE only: cost of goods sold, computed by the caller from average cost during movement posting. */
    cogsTotal?: number;
}

export interface InvoiceCancelledIntent extends PostingIntentBase {
    kind: 'INVOICE_CANCELLED';
    originalEntryId: string;
}

export interface PaymentRecordedIntent extends PostingIntentBase {
    kind: 'PAYMENT_RECORDED';
    type: 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT';
    partyId: string | null;
    amount: number;
    /** The Cashbox's linked GL account — a direct 1:1 config mapping, not a resolved policy account. */
    cashboxAccountId: string;
}

export interface PaymentCancelledIntent extends PostingIntentBase {
    kind: 'PAYMENT_CANCELLED';
    originalEntryId: string;
}

export interface ExpenseRecordedIntent extends PostingIntentBase {
    kind: 'EXPENSE_RECORDED';
    cashboxAccountId: string;
    /** Exchange-rate-adjusted total; caller pre-multiplies, matching the pre-Phase-1 builder contract. */
    totalAmount: number;
    /** Each item's `accountId` is direct user input from `CreateExpenseItemDto` — see contracts/posting-intent.ts header. */
    items: { accountId: string; amount: number; description: string; sortOrder: number }[];
}

export interface ExpenseCancelledIntent extends PostingIntentBase {
    kind: 'EXPENSE_CANCELLED';
    originalEntryId: string;
}

export interface StockCountAdjustedIntent extends PostingIntentBase {
    kind: 'STOCK_COUNT_ADJUSTED';
    /** Positive = surplus, negative = shortage, already valued at average cost. */
    netVariance: number;
}

export interface OpeningBalancePostedIntent extends PostingIntentBase {
    kind: 'OPENING_BALANCE_POSTED';
    /** Direct user input — see contracts/posting-intent.ts header. Pre-filtered to non-zero amounts by the caller. */
    entries: { accountId: string; amount: number }[];
}

export interface OpeningStockPostedIntent extends PostingIntentBase {
    kind: 'OPENING_STOCK_POSTED';
    totalValue: number;
}

export type PostingRecordIntent =
    | InvoicePostedIntent
    | PaymentRecordedIntent
    | ExpenseRecordedIntent
    | StockCountAdjustedIntent
    | OpeningBalancePostedIntent
    | OpeningStockPostedIntent;

export type PostingCancellationIntent =
    | InvoiceCancelledIntent
    | PaymentCancelledIntent
    | ExpenseCancelledIntent;

export type PostingIntent = PostingRecordIntent | PostingCancellationIntent;
```

- [ ] **Step 4: Typecheck (no runtime to test yet — these are pure types)**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
```

Expected: 0 errors (these three files aren't imported by anything yet, so this just confirms they parse).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/posting/contracts/
git commit -m "feat(accounting): add posting-intent contracts (Phase 1 task 1.1)"
```

---

## Task 2: Typed transaction — remove the load-bearing `any` (F2)

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/services/journal-posting.service.ts`
- Modify: `apps/api/src/modules/inventory/inventory.service.ts:106,126,141`
- Modify: `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts:123,139`
- Test: existing `apps/api/src/modules/accounting/accounts/services/journal-posting.service.spec.ts` (must stay green, no changes needed)
- Test: existing golden masters must stay green (no changes needed)

**Interfaces:**
- Consumes: `PrismaTransactionClient` from Task 1.
- Produces: `JournalPostingService.post(tx: PrismaTransactionClient, input: PostInput)`, `.reverse(tx: PrismaTransactionClient, input: ReverseInput)` — every later task's facade/policy code calls these with a real `PrismaTransactionClient`, not `any`.

- [ ] **Step 1: Run the baseline to confirm current green state**

```bash
pnpm --filter @devloggers/api test -- journal-posting.service.spec inventory.service.spec stock-counts.service.spec golden-master.spec
```

Expected: all suites pass (this is the pre-change baseline).

- [ ] **Step 2: Type `journal-posting.service.ts`'s transaction parameter**

Edit `apps/api/src/modules/accounting/accounts/services/journal-posting.service.ts`. Add the import and change both method signatures:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { assertFiscalPeriodOpen } from '../utils/assert-period-open';
import type { PrismaTransactionClient } from '../../posting/contracts/prisma-tx';
```

Change:

```ts
async post(tx: any, input: PostInput): Promise<{ id: string }> {
```

to:

```ts
async post(tx: PrismaTransactionClient, input: PostInput): Promise<{ id: string }> {
```

and:

```ts
async reverse(tx: any, input: ReverseInput): Promise<{ id: string }> {
```

to:

```ts
async reverse(tx: PrismaTransactionClient, input: ReverseInput): Promise<{ id: string }> {
```

Also replace the untyped account map cast inside `post`:

```ts
const accountMap = new Map<string, AccountMeta>(accounts.map((a: any) => [a.id, a as AccountMeta]));
```

with:

```ts
const accountMap = new Map<string, AccountMeta>(accounts.map((a) => [a.id, a]));
```

(`accounts` is already the typed result of `tx.chartOfAccount.findMany({ select: {...} })`, so once `tx` is typed the inferred row shape matches `AccountMeta` without a cast — Prisma's generated `findMany` return type carries the `select` shape automatically.)

And in `reverse`, replace:

```ts
const reversedLines: PostingJournalLine[] = original.lines.map((l: any) => ({
```

with:

```ts
const reversedLines: PostingJournalLine[] = original.lines.map((l) => ({
```

`original` comes from `tx.journalEntry.findFirst({ include: { lines: {...} } })`, so `l` is now a typed `JournalLine` row once `tx` carries the real Prisma type — no cast needed.

- [ ] **Step 3: Typecheck — this will surface exactly which cast sites are now real errors**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
```

If `accountMap`/`reversedLines` still show `TS2345` or similar, it means a `select`/`include` field is missing from the query relative to `AccountMeta`/the line shape used in the map — fix the query's `select`/`include`, never re-add a cast.

- [ ] **Step 4: Remove the two `tx as any` casts in `inventory.service.ts`**

In `apps/api/src/modules/inventory/inventory.service.ts`, the file currently has:

```ts
async postMovement(params: MovementParams) {
    return this.prisma.$transaction((tx) => this.postMovementTx(tx as unknown as InventoryTx, params));
}
```

and (inside `registerOpeningBalance`, twice):

```ts
await this.postMovementTx(tx as unknown as InventoryTx, {
```

and:

```ts
const entry = await this.journalPosting.post(tx as any, {
```

Change `postMovementTx`'s own parameter type first — it currently takes the hand-rolled `InventoryTx` structural type. Replace:

```ts
export type InventoryTx = {
    stockMovement: { create: (args: any) => Promise<{ id: string }> };
    stockBalance: {
        findUnique: (args: any) => Promise<any>;
        create: (args: any) => Promise<any>;
        update: (args: any) => Promise<any>;
    };
};
```

with nothing (delete the type entirely — it existed only to give the `any` cast somewhere to land) and change:

```ts
async postMovementTx(tx: InventoryTx, params: MovementParams): Promise<{ id: string }> {
```

to:

```ts
async postMovementTx(tx: PrismaTransactionClient, params: MovementParams): Promise<{ id: string }> {
```

Add the import at the top:

```ts
import type { PrismaTransactionClient } from '../accounting/posting/contracts/prisma-tx';
```

Then the three call sites simplify to:

```ts
async postMovement(params: MovementParams) {
    return this.prisma.$transaction((tx) => this.postMovementTx(tx, params));
}
```

```ts
await this.postMovementTx(tx, {
    tenantId,
    userId,
    warehouseId: dto.warehouseId,
    itemId: item.itemId,
    fiscalPeriodId: dto.fiscalPeriodId,
    movementType: StockMovementType.OPENING,
    quantity: item.quantity,
    unitCost: item.unitCost,
    notes: 'Opening Balance Registration',
});
```

```ts
const entry = await this.journalPosting.post(tx, {
```

(This last call site is deleted outright in Task 15 once `registerOpeningBalance` routes through the facade instead — for this task, just drop the `as any` so it typechecks against the now-typed `JournalPostingService.post`.)

- [ ] **Step 5: Remove the two `tx as any` casts in `stock-counts.service.ts`**

In `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts`, replace:

```ts
await this.inventoryService.postMovementTx(tx as any, {
```

with:

```ts
await this.inventoryService.postMovementTx(tx, {
```

and:

```ts
await this.journalPosting.post(tx as any, {
```

with:

```ts
await this.journalPosting.post(tx, {
```

No import changes needed here — `tx` is already the callback parameter of `this.prisma.$transaction(async (tx) => {...})`, which Prisma types as `Prisma.TransactionClient` natively; the casts were only needed because `postMovementTx`/`journalPosting.post` used to demand `any`/`InventoryTx`.

- [ ] **Step 6: Full typecheck and test run — golden masters must stay green**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm --filter @devloggers/api test
```

Expected: 0 typecheck errors, all suites pass including `golden-master.spec.ts` (unchanged expectations).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/services/journal-posting.service.ts apps/api/src/modules/inventory/inventory.service.ts apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts
git commit -m "fix(accounting): type the posting transaction handle, drop tx-as-any casts (Phase 1 task 1.2)"
```

---

## Task 3: `invoice-posted.policy.ts` (absorbs invoice-posting.service.ts:40-75 + invoice-journal.ts + COGS lines)

**Files:**
- Create: `apps/api/src/modules/accounting/posting/policies/invoice-posted.policy.ts`
- Test: `apps/api/src/modules/accounting/posting/policies/invoice-posted.policy.spec.ts`

**Interfaces:**
- Consumes: `InvoicePostedIntent`, `JournalLineDraft`, `PrismaTransactionClient` (Task 1); `FinancialSettingsService.getOrThrow(tenantId)` (existing).
- Produces: `InvoicePostedPolicy.buildLines(tx, intent): Promise<JournalLineDraft[]>` — consumed by the registry in Task 10.

This absorbs two things verbatim: the account-resolution block at the top of `postPurchaseInvoice`/`postSalesInvoice` (settings lookup, party-override fallback, missing-account guards) and the pure math in `invoice-journal.ts`'s `buildInvoiceJournalLines` + `inventory-journal.ts`'s `buildCogsJournalLines`. The one behavioural change worth naming: the party-override lookup moves from a Prisma `include` on the invoice query (done by the caller) to a direct `tx.party.findFirst(...)` inside the policy — same data, one extra round trip, zero output difference (verified by the golden masters' "party-level … overrides the tenant default" tests, which assert on the resulting line only, not on query count).

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/accounting/posting/policies/invoice-posted.policy.spec.ts
import { BadRequestException } from '@nestjs/common';
import { InvoicePostedPolicy } from './invoice-posted.policy';
import type { InvoicePostedIntent } from '../contracts/posting-intent';

const SETTINGS = {
    defaultReceivableAccountId: 'ar',
    defaultPayableAccountId: 'ap',
    defaultSalesAccountId: 'sales',
    defaultPurchaseAccountId: 'purchase',
    defaultTaxAccountId: 'tax',
    defaultInventoryAccountId: 'inv',
    defaultCogsAccountId: 'cogs',
};

function build(settings: Partial<typeof SETTINGS> = {}) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue({ ...SETTINGS, ...settings }) } as any;
    const tx = { party: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    return { policy: new InvoicePostedPolicy(financialSettingsService), tx, financialSettingsService };
}

const baseIntent: InvoicePostedIntent = {
    kind: 'INVOICE_POSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-01'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'inv-1',
    description: 'Purchase invoice INV-001',
    direction: 'PURCHASE',
    partyId: 'party-1',
    netAmount: 1000,
    taxAmount: 0,
    total: 1000,
};

describe('InvoicePostedPolicy.buildLines', () => {
    it('PURCHASE with no inventory portion: debits Purchase, credits Payable', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines).toEqual([
            { accountId: 'purchase', debit: 1000, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'ap', debit: 0, credit: 1000, description: null, sortOrder: 1, partyId: 'party-1' },
        ]);
    });

    it('PURCHASE with a stock portion: capitalises to Inventory and expenses the remainder', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, inventoryAmount: 700 });
        expect(lines).toEqual([
            { accountId: 'inv', debit: 700, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'purchase', debit: 300, credit: 0, description: null, sortOrder: 1 },
            { accountId: 'ap', debit: 0, credit: 1000, description: null, sortOrder: 2, partyId: 'party-1' },
        ]);
    });

    it('party-level payable override wins over the tenant default', async () => {
        const { policy, tx } = build();
        tx.party.findFirst.mockResolvedValue({ payableAccountId: 'party-ap', receivableAccountId: null });
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines.at(-1)).toMatchObject({ accountId: 'party-ap' });
    });

    it('rejects a PURCHASE with no payable account configured anywhere', async () => {
        const { policy, tx } = build({ defaultPayableAccountId: undefined as any });
        await expect(policy.buildLines(tx, baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('SALE: debits Receivable, credits Sales, with the party on the AR leg', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, direction: 'SALE' });
        expect(lines).toEqual([
            { accountId: 'ar', debit: 1000, credit: 0, description: null, sortOrder: 0, partyId: 'party-1' },
            { accountId: 'sales', debit: 0, credit: 1000, description: null, sortOrder: 1 },
        ]);
    });

    it('SALE with tax: Tax Payable is credited alongside revenue', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, direction: 'SALE', taxAmount: 150, total: 1150 });
        expect(lines).toEqual([
            { accountId: 'ar', debit: 1150, credit: 0, description: null, sortOrder: 0, partyId: 'party-1' },
            { accountId: 'sales', debit: 0, credit: 1000, description: null, sortOrder: 1 },
            { accountId: 'tax', debit: 0, credit: 150, description: null, sortOrder: 2 },
        ]);
    });

    it('SALE with a cogsTotal: appends DR COGS / CR Inventory after the revenue legs', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, direction: 'SALE', cogsTotal: 600 });
        expect(lines).toEqual([
            { accountId: 'ar', debit: 1000, credit: 0, description: null, sortOrder: 0, partyId: 'party-1' },
            { accountId: 'sales', debit: 0, credit: 1000, description: null, sortOrder: 1 },
            { accountId: 'cogs', debit: 600, credit: 0, description: null, sortOrder: 2 },
            { accountId: 'inv', debit: 0, credit: 600, description: null, sortOrder: 3 },
        ]);
    });

    it('applies the exchange rate to every leg', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, exchangeRate: 2.5 });
        expect(lines).toEqual([
            { accountId: 'purchase', debit: 2500, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'ap', debit: 0, credit: 2500, description: null, sortOrder: 1, partyId: 'party-1' },
        ]);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm --filter @devloggers/api test -- invoice-posted.policy.spec
```

Expected: FAIL — `Cannot find module './invoice-posted.policy'`.

- [ ] **Step 3: Implement the policy**

```ts
// apps/api/src/modules/accounting/posting/policies/invoice-posted.policy.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';
import type { InvoicePostedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/**
 * Builds balanced double-entry lines for an invoice, absorbing what used to
 * live at the top of InvoicePostingService.postPurchaseInvoice/postSalesInvoice
 * (account resolution) plus invoice-journal.ts and inventory-journal.ts's
 * buildCogsJournalLines (the math). See docs/superpowers/specs/2026-07-25-architecture-refactor/00-findings.md#f1.
 */
@Injectable()
export class InvoicePostedPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(tx: PrismaTransactionClient, intent: InvoicePostedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        const party = await tx.party.findFirst({
            where: { id: intent.partyId, tenantId: intent.tenantId },
            select: { receivableAccountId: true, payableAccountId: true },
        });

        const rate = intent.exchangeRate;
        const totalBase = round(intent.total * rate);
        const netBase = round(intent.netAmount * rate);
        const taxBase = round(intent.taxAmount * rate);

        if (intent.direction === 'SALE') {
            const receivableAccountId = party?.receivableAccountId ?? settings.defaultReceivableAccountId;
            if (!receivableAccountId) {
                throw new BadRequestException(
                    'No Accounts Receivable account configured. Set a default in Financial Settings or on the party.',
                );
            }
            if (!settings.defaultSalesAccountId) {
                throw new BadRequestException('No default Sales account configured in Financial Settings.');
            }

            const lines: JournalLineDraft[] = [
                { accountId: receivableAccountId, debit: totalBase, credit: 0, description: null, sortOrder: 0, partyId: intent.partyId },
                { accountId: settings.defaultSalesAccountId, debit: 0, credit: netBase, description: null, sortOrder: 1 },
            ];
            if (taxBase > 0 && settings.defaultTaxAccountId) {
                lines.push({ accountId: settings.defaultTaxAccountId, debit: 0, credit: taxBase, description: null, sortOrder: 2 });
            }
            if (intent.cogsTotal && intent.cogsTotal > 0) {
                if (!settings.defaultCogsAccountId || !settings.defaultInventoryAccountId) {
                    throw new BadRequestException('No default COGS / Inventory account configured in Financial Settings.');
                }
                const cogsBase = round(intent.cogsTotal);
                lines.push(
                    { accountId: settings.defaultCogsAccountId, debit: cogsBase, credit: 0, description: null, sortOrder: lines.length },
                    { accountId: settings.defaultInventoryAccountId, debit: 0, credit: cogsBase, description: null, sortOrder: lines.length + 1 },
                );
            }
            return lines;
        }

        // PURCHASE
        const payableAccountId = party?.payableAccountId ?? settings.defaultPayableAccountId;
        if (!payableAccountId) {
            throw new BadRequestException(
                'No Accounts Payable account configured. Set a default in Financial Settings or on the party.',
            );
        }
        if (!settings.defaultPurchaseAccountId) {
            throw new BadRequestException('No default Purchase account configured in Financial Settings.');
        }

        const invBase = round((intent.inventoryAmount ?? 0) * rate);
        const expenseBase = round(netBase - invBase);
        const lines: JournalLineDraft[] = [];

        if (invBase > 0) {
            if (!settings.defaultInventoryAccountId) {
                throw new BadRequestException('No default Inventory account configured in Financial Settings.');
            }
            lines.push({ accountId: settings.defaultInventoryAccountId, debit: invBase, credit: 0, description: null, sortOrder: lines.length });
        }
        if (expenseBase > 0) {
            lines.push({ accountId: settings.defaultPurchaseAccountId, debit: expenseBase, credit: 0, description: null, sortOrder: lines.length });
        }
        if (taxBase > 0 && settings.defaultTaxAccountId) {
            lines.push({ accountId: settings.defaultTaxAccountId, debit: taxBase, credit: 0, description: null, sortOrder: lines.length });
        }
        lines.push({ accountId: payableAccountId, debit: 0, credit: totalBase, description: null, sortOrder: lines.length, partyId: intent.partyId });
        return lines;
    }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @devloggers/api test -- invoice-posted.policy.spec
```

Expected: PASS, 8/8.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/posting/policies/invoice-posted.policy.ts apps/api/src/modules/accounting/posting/policies/invoice-posted.policy.spec.ts
git commit -m "feat(accounting): add invoice-posted posting policy (Phase 1 task 1.4.1)"
```

---

## Task 4: `invoice-cancelled.policy.ts`

**Files:**
- Create: `apps/api/src/modules/accounting/posting/policies/invoice-cancelled.policy.ts`
- Test: `apps/api/src/modules/accounting/posting/policies/invoice-cancelled.policy.spec.ts`

**Interfaces:**
- Produces: `InvoiceCancelledPolicy.referenceType: ReferenceType` — consumed by the registry's `resolveReversal` in Task 10.

Invoice cancellation has no line-building logic at all: `JournalPostingService.reverse` reads the original entry back and swaps every line's debit/credit itself (see `journal-posting.service.ts`, unchanged by this phase). This class exists only to name the reversal's `ReferenceType`, so the registry's dispatch table stays symmetric across all nine intent kinds instead of special-casing three of them.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/accounting/posting/policies/invoice-cancelled.policy.spec.ts
import { ReferenceType } from '@devloggers/db-prisma';
import { InvoiceCancelledPolicy } from './invoice-cancelled.policy';

describe('InvoiceCancelledPolicy', () => {
    it('names the INVOICE_CANCELLATION reference type', () => {
        expect(new InvoiceCancelledPolicy().referenceType).toBe(ReferenceType.INVOICE_CANCELLATION);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm --filter @devloggers/api test -- invoice-cancelled.policy.spec
```

Expected: FAIL — `Cannot find module './invoice-cancelled.policy'`.

- [ ] **Step 3: Implement**

```ts
// apps/api/src/modules/accounting/posting/policies/invoice-cancelled.policy.ts
import { Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';

/**
 * No line-builder: JournalPostingService.reverse mirrors the original entry's
 * lines verbatim. This class only names the reversal's referenceType so the
 * registry's dispatch stays uniform across every posting kind.
 */
@Injectable()
export class InvoiceCancelledPolicy {
    readonly referenceType = ReferenceType.INVOICE_CANCELLATION;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @devloggers/api test -- invoice-cancelled.policy.spec
```

Expected: PASS, 1/1.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/posting/policies/invoice-cancelled.policy.ts apps/api/src/modules/accounting/posting/policies/invoice-cancelled.policy.spec.ts
git commit -m "feat(accounting): add invoice-cancelled posting policy (Phase 1 task 1.4.2)"
```

---

## Task 5: `payment-recorded.policy.ts` (+ cancellation)

**Files:**
- Create: `apps/api/src/modules/accounting/posting/policies/payment-recorded.policy.ts`
- Test: `apps/api/src/modules/accounting/posting/policies/payment-recorded.policy.spec.ts`

**Interfaces:**
- Produces: `PaymentRecordedPolicy.buildLines(tx, intent): Promise<JournalLineDraft[]>`, `PaymentCancelledPolicy.referenceType`.

Absorbs `payments.service.ts:114-140` (settings + party-override resolution) and all of `payment-journal.ts`'s `buildPaymentJournalLines`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/accounting/posting/policies/payment-recorded.policy.spec.ts
import { BadRequestException } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from './payment-recorded.policy';
import type { PaymentRecordedIntent } from '../contracts/posting-intent';

const SETTINGS = { defaultReceivableAccountId: 'ar', defaultPayableAccountId: 'ap' };

function build(settings: Partial<typeof SETTINGS> = {}) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue({ ...SETTINGS, ...settings }) } as any;
    const tx = { party: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    return { policy: new PaymentRecordedPolicy(financialSettingsService), tx };
}

const baseIntent: PaymentRecordedIntent = {
    kind: 'PAYMENT_RECORDED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-02'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'payment-1',
    description: 'Payment PAY-001',
    type: 'RECEIPT',
    partyId: 'party-1',
    amount: 500,
    cashboxAccountId: 'cashbox',
};

describe('PaymentRecordedPolicy.buildLines', () => {
    it('RECEIPT: debits Cashbox, credits Receivable with the party on the AR leg', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines).toEqual([
            { accountId: 'cashbox', debit: 500, credit: 0, description: null, sortOrder: 0, partyId: null },
            { accountId: 'ar', debit: 0, credit: 500, description: null, sortOrder: 1, partyId: 'party-1' },
        ]);
    });

    it('PAYMENT: debits Payable (party on the AP leg), credits Cashbox', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, type: 'PAYMENT' });
        expect(lines).toEqual([
            { accountId: 'ap', debit: 500, credit: 0, description: null, sortOrder: 0, partyId: 'party-1' },
            { accountId: 'cashbox', debit: 0, credit: 500, description: null, sortOrder: 1, partyId: null },
        ]);
    });

    it('party-level receivable override wins over the tenant default', async () => {
        const { policy, tx } = build();
        tx.party.findFirst.mockResolvedValue({ receivableAccountId: 'party-ar', payableAccountId: null });
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines[1]).toMatchObject({ accountId: 'party-ar' });
    });

    it('rejects a RECEIPT with no receivable account configured anywhere', async () => {
        const { policy, tx } = build({ defaultReceivableAccountId: undefined as any });
        await expect(policy.buildLines(tx, baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('applies the exchange rate', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, exchangeRate: 3 });
        expect(lines.map((l) => l.debit + l.credit)).toEqual([1500, 1500]);
    });
});

describe('PaymentCancelledPolicy', () => {
    it('names the PAYMENT_CANCELLATION reference type', () => {
        expect(new PaymentCancelledPolicy().referenceType).toBe(ReferenceType.PAYMENT_CANCELLATION);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm --filter @devloggers/api test -- payment-recorded.policy.spec
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/api/src/modules/accounting/posting/policies/payment-recorded.policy.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';
import type { PaymentRecordedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/** Absorbs payments.service.ts's account resolution + payment-journal.ts's line math. */
@Injectable()
export class PaymentRecordedPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(tx: PrismaTransactionClient, intent: PaymentRecordedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        const isReceipt = intent.type === 'RECEIPT';

        const party = intent.partyId
            ? await tx.party.findFirst({
                  where: { id: intent.partyId, tenantId: intent.tenantId },
                  select: { receivableAccountId: true, payableAccountId: true },
              })
            : null;

        const counterpartAccountId = isReceipt
            ? (party?.receivableAccountId ?? settings.defaultReceivableAccountId)
            : (party?.payableAccountId ?? settings.defaultPayableAccountId);

        if (!counterpartAccountId) {
            throw new BadRequestException(
                isReceipt
                    ? 'No Accounts Receivable account configured. Set a default in Financial Settings or on the party.'
                    : 'No Accounts Payable account configured. Set a default in Financial Settings or on the party.',
            );
        }

        const amountBase = round(intent.amount * intent.exchangeRate);

        return [
            {
                accountId: isReceipt ? intent.cashboxAccountId : counterpartAccountId,
                debit: amountBase,
                credit: 0,
                description: null,
                sortOrder: 0,
                partyId: isReceipt ? null : intent.partyId,
            },
            {
                accountId: isReceipt ? counterpartAccountId : intent.cashboxAccountId,
                debit: 0,
                credit: amountBase,
                description: null,
                sortOrder: 1,
                partyId: isReceipt ? intent.partyId : null,
            },
        ];
    }
}

/** No line-builder — JournalPostingService.reverse mirrors the original entry. */
@Injectable()
export class PaymentCancelledPolicy {
    readonly referenceType = ReferenceType.PAYMENT_CANCELLATION;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @devloggers/api test -- payment-recorded.policy.spec
```

Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/posting/policies/payment-recorded.policy.ts apps/api/src/modules/accounting/posting/policies/payment-recorded.policy.spec.ts
git commit -m "feat(accounting): add payment-recorded posting policy (Phase 1 task 1.4.3)"
```

---

## Task 6: `expense-recorded.policy.ts` (+ cancellation)

**Files:**
- Create: `apps/api/src/modules/accounting/posting/policies/expense-recorded.policy.ts`
- Test: `apps/api/src/modules/accounting/posting/policies/expense-recorded.policy.spec.ts`

**Interfaces:**
- Produces: `ExpenseRecordedPolicy.buildLines(intent): JournalLineDraft[]` (pure, synchronous — no `tx`, no injected settings), `ExpenseCancelledPolicy.referenceType`.

**Why this one carries `accountId` on its intent (the documented exception):** every expense item's `accountId` is chosen directly by the user in `CreateExpenseItemDto` — there is no fallback/override resolution (no "party default", no "tenant default"), only `assertAccountFitsSlot` type-validation, which already runs in `expenses.service.ts` before the transaction and is unaffected by this move. Absorbing this into a policy still satisfies F1's actual concern: `expenses.service.ts` no longer imports `JournalPostingService`, does not decide *how* to structure the double entry, and does not know what an `EXPENSE` reference type even is.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/accounting/posting/policies/expense-recorded.policy.spec.ts
import { ReferenceType } from '@devloggers/db-prisma';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from './expense-recorded.policy';
import type { ExpenseRecordedIntent } from '../contracts/posting-intent';

const baseIntent: ExpenseRecordedIntent = {
    kind: 'EXPENSE_RECORDED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-03'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'expense-1',
    description: 'Expense EXP-001',
    cashboxAccountId: 'cashbox',
    totalAmount: 300,
    items: [
        { accountId: 'exp-rent', amount: 200, description: 'Rent', sortOrder: 0 },
        { accountId: 'exp-utilities', amount: 100, description: 'Utilities', sortOrder: 1 },
    ],
};

describe('ExpenseRecordedPolicy.buildLines', () => {
    it('debits each item account and credits the cashbox for the total', () => {
        const lines = new ExpenseRecordedPolicy().buildLines(baseIntent);
        expect(lines).toEqual([
            { accountId: 'exp-rent', debit: 200, credit: 0, description: 'Rent', sortOrder: 0 },
            { accountId: 'exp-utilities', debit: 100, credit: 0, description: 'Utilities', sortOrder: 1 },
            { accountId: 'cashbox', debit: 0, credit: 300, description: null, sortOrder: 2 },
        ]);
    });

    it('stays balanced', () => {
        const lines = new ExpenseRecordedPolicy().buildLines(baseIntent);
        const debits = lines.reduce((s, l) => s + l.debit, 0);
        const credits = lines.reduce((s, l) => s + l.credit, 0);
        expect(debits).toBe(credits);
    });
});

describe('ExpenseCancelledPolicy', () => {
    it('names the EXPENSE_CANCELLATION reference type', () => {
        expect(new ExpenseCancelledPolicy().referenceType).toBe(ReferenceType.EXPENSE_CANCELLATION);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm --filter @devloggers/api test -- expense-recorded.policy.spec
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/api/src/modules/accounting/posting/policies/expense-recorded.policy.ts
import { Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { ExpenseRecordedIntent } from '../contracts/posting-intent';

/**
 * Pure — every item's accountId is direct user input (CreateExpenseItemDto),
 * not a resolved GL policy, so there is nothing async to await here. See
 * this file's header comment in the plan for why that's not a violation of
 * "no accountId on intents".
 */
@Injectable()
export class ExpenseRecordedPolicy {
    buildLines(intent: ExpenseRecordedIntent): JournalLineDraft[] {
        const itemLines: JournalLineDraft[] = intent.items.map((item) => ({
            accountId: item.accountId,
            debit: item.amount,
            credit: 0,
            description: item.description,
            sortOrder: item.sortOrder,
        }));
        return [
            ...itemLines,
            {
                accountId: intent.cashboxAccountId,
                debit: 0,
                credit: intent.totalAmount,
                description: null,
                sortOrder: intent.items.length,
            },
        ];
    }
}

/** No line-builder — JournalPostingService.reverse mirrors the original entry. */
@Injectable()
export class ExpenseCancelledPolicy {
    readonly referenceType = ReferenceType.EXPENSE_CANCELLATION;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @devloggers/api test -- expense-recorded.policy.spec
```

Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/posting/policies/expense-recorded.policy.ts apps/api/src/modules/accounting/posting/policies/expense-recorded.policy.spec.ts
git commit -m "feat(accounting): add expense-recorded posting policy (Phase 1 task 1.4.4)"
```

---

## Task 7: `stock-count-adjusted.policy.ts`

**Files:**
- Create: `apps/api/src/modules/accounting/posting/policies/stock-count-adjusted.policy.ts`
- Test: `apps/api/src/modules/accounting/posting/policies/stock-count-adjusted.policy.spec.ts`

**Interfaces:**
- Produces: `StockCountAdjustedPolicy.buildLines(intent): Promise<JournalLineDraft[]>`.

Absorbs `stock-counts.service.ts:106-109`'s settings guard and `inventory-journal.ts`'s `buildStockCountVarianceLines`. The caller (Task 14) keeps deciding *whether* to call this at all — a zero-variance count never calls `facade.record()`, exactly as it never called `journalPosting.post()` before.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/accounting/posting/policies/stock-count-adjusted.policy.spec.ts
import { BadRequestException } from '@nestjs/common';
import { StockCountAdjustedPolicy } from './stock-count-adjusted.policy';
import type { StockCountAdjustedIntent } from '../contracts/posting-intent';

function build(settings: Record<string, unknown> = { defaultInventoryAccountId: 'inv', defaultInventoryAdjustmentAccountId: 'adj' }) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    return new StockCountAdjustedPolicy(financialSettingsService);
}

const baseIntent: StockCountAdjustedIntent = {
    kind: 'STOCK_COUNT_ADJUSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-04'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'sc-1',
    description: 'Stock count variance SC-001',
    netVariance: 250,
};

describe('StockCountAdjustedPolicy.buildLines', () => {
    it('surplus debits Inventory, credits the adjustment account', async () => {
        const lines = await build().buildLines(baseIntent);
        expect(lines).toEqual([
            { accountId: 'inv', debit: 250, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'adj', debit: 0, credit: 250, description: null, sortOrder: 1 },
        ]);
    });

    it('shortage reverses the sides and uses the absolute amount', async () => {
        const lines = await build().buildLines({ ...baseIntent, netVariance: -250 });
        expect(lines).toEqual([
            { accountId: 'inv', debit: 0, credit: 250, description: null, sortOrder: 0 },
            { accountId: 'adj', debit: 250, credit: 0, description: null, sortOrder: 1 },
        ]);
    });

    it('rejects when Inventory / Adjustment accounts are not configured', async () => {
        const policy = build({});
        await expect(policy.buildLines(baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm --filter @devloggers/api test -- stock-count-adjusted.policy.spec
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/api/src/modules/accounting/posting/policies/stock-count-adjusted.policy.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { StockCountAdjustedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/** Absorbs stock-counts.service.ts's settings guard + inventory-journal.ts's buildStockCountVarianceLines. */
@Injectable()
export class StockCountAdjustedPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(intent: StockCountAdjustedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        if (!settings.defaultInventoryAccountId || !settings.defaultInventoryAdjustmentAccountId) {
            throw new BadRequestException(
                'No default Inventory / Inventory-Adjustment account configured in Financial Settings.',
            );
        }
        const amt = round(Math.abs(intent.netVariance));
        const surplus = intent.netVariance > 0;
        return [
            { accountId: settings.defaultInventoryAccountId, debit: surplus ? amt : 0, credit: surplus ? 0 : amt, description: null, sortOrder: 0 },
            { accountId: settings.defaultInventoryAdjustmentAccountId, debit: surplus ? 0 : amt, credit: surplus ? amt : 0, description: null, sortOrder: 1 },
        ];
    }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @devloggers/api test -- stock-count-adjusted.policy.spec
```

Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/posting/policies/stock-count-adjusted.policy.ts apps/api/src/modules/accounting/posting/policies/stock-count-adjusted.policy.spec.ts
git commit -m "feat(accounting): add stock-count-adjusted posting policy (Phase 1 task 1.4.5)"
```

---

## Task 8: `opening-balance.policy.ts` (chart-of-accounts opening balances)

**Files:**
- Create: `apps/api/src/modules/accounting/posting/policies/opening-balance.policy.ts`
- Test: `apps/api/src/modules/accounting/posting/policies/opening-balance.policy.spec.ts`

**Interfaces:**
- Produces: `OpeningBalancePolicy.buildLines(tx, intent): Promise<JournalLineDraft[]>`.

Absorbs the entirety of `opening-balances.service.ts`'s account classification + suspense-offset logic (lines 43-124 of that file). **This is the second intent that carries `accountId` by design** (`OpeningBalancePostedIntent.entries[].accountId`): the whole feature is "the user tells the ledger what each account's opening balance is" — the account IS the user's input, not something a policy resolves via settings/party fallback. `defaultOpeningEquityAccountId` (the suspense account) is the one part that *is* resolved from `FinancialSettings`, per `.ai/rules/domain.md` §2's balancing-suspense-account rule, and that part stays exactly as before.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/accounting/posting/policies/opening-balance.policy.spec.ts
import { BadRequestException } from '@nestjs/common';
import { OpeningBalancePolicy } from './opening-balance.policy';
import type { OpeningBalancePostedIntent } from '../contracts/posting-intent';

function build(settings: Record<string, unknown> = { defaultOpeningEquityAccountId: 'oe' }, accounts: any[] = []) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    const tx = { chartOfAccount: { findMany: jest.fn().mockResolvedValue(accounts) } } as any;
    return { policy: new OpeningBalancePolicy(financialSettingsService), tx };
}

const ACCOUNTS = [
    { id: 'cash', code: 'cash', type: 'ASSET', isPostable: true, isActive: true, deletedAt: null },
    { id: 'loan', code: 'loan', type: 'LIABILITY', isPostable: true, isActive: true, deletedAt: null },
    { id: 'oe', code: 'oe', type: 'EQUITY', isPostable: true, isActive: true, deletedAt: null },
];

const baseIntent: OpeningBalancePostedIntent = {
    kind: 'OPENING_BALANCE_POSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-01-01'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'opening-balance-1',
    description: 'Opening balances',
    entries: [{ accountId: 'cash', amount: 1000 }],
};

describe('OpeningBalancePolicy.buildLines', () => {
    it('a positive ASSET entry debits the account and credits the offset to Opening Equity', async () => {
        const { policy, tx } = build(undefined, ACCOUNTS);
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines).toEqual([
            { accountId: 'cash', debit: 1000, credit: 0, description: 'Opening balance - cash', sortOrder: 0 },
            { accountId: 'oe', debit: 0, credit: 1000, description: 'Opening balance offset', sortOrder: 1 },
        ]);
    });

    it('a LIABILITY entry credits the account; already-balanced entries need no offset', async () => {
        const { policy, tx } = build(undefined, ACCOUNTS);
        const lines = await policy.buildLines(tx, {
            ...baseIntent,
            entries: [
                { accountId: 'cash', amount: 1000 },
                { accountId: 'loan', amount: 1000 },
            ],
        });
        expect(lines).toEqual([
            { accountId: 'cash', debit: 1000, credit: 0, description: 'Opening balance - cash', sortOrder: 0 },
            { accountId: 'loan', debit: 0, credit: 1000, description: 'Opening balance - loan', sortOrder: 1 },
        ]);
    });

    it('rejects when no opening-equity account is configured', async () => {
        const { policy, tx } = build({}, ACCOUNTS);
        await expect(policy.buildLines(tx, baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an entry against a non ASSET/LIABILITY/EQUITY account', async () => {
        const { policy, tx } = build(undefined, [...ACCOUNTS, { id: 'rev', code: 'rev', type: 'REVENUE', isPostable: true, isActive: true, deletedAt: null }]);
        await expect(
            policy.buildLines(tx, { ...baseIntent, entries: [{ accountId: 'rev', amount: 500 }] }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm --filter @devloggers/api test -- opening-balance.policy.spec
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/api/src/modules/accounting/posting/policies/opening-balance.policy.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import type { AccountType } from '@devloggers/db-prisma';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';
import type { OpeningBalancePostedIntent } from '../contracts/posting-intent';

/**
 * Absorbs opening-balances.service.ts's account classification + suspense
 * offset. `entries[].accountId` is direct user input (see contracts/posting-intent.ts
 * header) — only `defaultOpeningEquityAccountId` is resolved from settings.
 */
@Injectable()
export class OpeningBalancePolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(tx: PrismaTransactionClient, intent: OpeningBalancePostedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        const openingEquityAccountId = settings.defaultOpeningEquityAccountId;
        if (!openingEquityAccountId) {
            throw new BadRequestException('No default opening equity account configured in Financial Settings');
        }

        const accountIds = [...new Set(intent.entries.map((e) => e.accountId)), openingEquityAccountId];
        const accounts = await tx.chartOfAccount.findMany({
            where: { id: { in: accountIds }, tenantId: intent.tenantId },
            select: { id: true, code: true, type: true, isPostable: true, isActive: true, deletedAt: true },
        });
        const accountMap = new Map(accounts.map((a) => [a.id, a]));

        for (const entry of intent.entries) {
            const account = accountMap.get(entry.accountId);
            if (!account) throw new BadRequestException(`Account not found: ${entry.accountId}`);
            if (!account.isPostable || account.deletedAt) throw new BadRequestException(`Account "${account.code}" is not postable`);
            if (!account.isActive) throw new BadRequestException(`Account "${account.code}" is not active`);
            const allowedTypes: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY'];
            if (!allowedTypes.includes(account.type)) {
                throw new BadRequestException(`Account "${account.code}" must be ASSET, LIABILITY, or EQUITY (got ${account.type})`);
            }
        }
        if (!accountMap.get(openingEquityAccountId)) {
            throw new BadRequestException('Opening equity account not found');
        }

        const lines: JournalLineDraft[] = [];
        let totalDebits = 0;
        let totalCredits = 0;
        let sortOrder = 0;

        for (const entry of intent.entries) {
            const account = accountMap.get(entry.accountId)!;
            const absAmount = Math.abs(entry.amount);

            if (account.type === 'ASSET') {
                lines.push({
                    accountId: entry.accountId,
                    debit: entry.amount > 0 ? absAmount : 0,
                    credit: entry.amount < 0 ? absAmount : 0,
                    description: `Opening balance - ${account.code}`,
                    sortOrder: sortOrder++,
                });
                if (entry.amount > 0) totalDebits += absAmount; else totalCredits += absAmount;
            } else {
                lines.push({
                    accountId: entry.accountId,
                    debit: entry.amount < 0 ? absAmount : 0,
                    credit: entry.amount > 0 ? absAmount : 0,
                    description: `Opening balance - ${account.code}`,
                    sortOrder: sortOrder++,
                });
                if (entry.amount > 0) totalCredits += absAmount; else totalDebits += absAmount;
            }
        }

        const diff = totalDebits - totalCredits;
        if (diff !== 0) {
            if (diff > 0) {
                lines.push({ accountId: openingEquityAccountId, debit: 0, credit: diff, description: 'Opening balance offset', sortOrder: sortOrder++ });
            } else {
                lines.push({ accountId: openingEquityAccountId, debit: Math.abs(diff), credit: 0, description: 'Opening balance offset', sortOrder: sortOrder++ });
            }
        }

        return lines;
    }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @devloggers/api test -- opening-balance.policy.spec
```

Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/posting/policies/opening-balance.policy.ts apps/api/src/modules/accounting/posting/policies/opening-balance.policy.spec.ts
git commit -m "feat(accounting): add opening-balance posting policy (Phase 1 task 1.4.6)"
```

---

## Task 9: `opening-stock.policy.ts` (resolves Q1)

**Files:**
- Create: `apps/api/src/modules/accounting/posting/policies/opening-stock.policy.ts`
- Test: `apps/api/src/modules/accounting/posting/policies/opening-stock.policy.spec.ts`

**Interfaces:**
- Produces: `OpeningStockPolicy.buildLines(intent): Promise<JournalLineDraft[]>`.

Absorbs `inventory.service.ts`'s `registerOpeningBalance` settings guard + `inventory-journal.ts`'s `buildOpeningBalanceLines`.

**Q1, answered:** *"Does `ReferenceType` need a stock-specific `OPENING_STOCK` member?"* — **No, not in Phase 1.** `packages/db-prisma/src/schema/accounting.prisma:17-28` has no such member today, and both this policy and `OpeningBalancePolicy` (Task 8) already share `ReferenceType.OPENING_BALANCE` in the pre-Phase-1 code (`inventory.service.ts:147` and `opening-balances.service.ts:140` both post `OPENING_BALANCE`). Adding a new enum member is a schema migration — out of scope for a phase whose entire premise is "behaviour-preserving by construction." The registry (Task 10) maps both `OPENING_BALANCE_POSTED` and `OPENING_STOCK_POSTED` intent kinds to the same `ReferenceType.OPENING_BALANCE`, preserving exactly what's on disk today. Logged to the Q2 log at the bottom of this plan as a real (pre-existing, not introduced) modeling gap: the two flows are indistinguishable in `journalEntry.referenceType`, which means a report grouping GL entries by reference type cannot currently tell an inventory opening balance from a chart-of-accounts opening balance apart. Worth a follow-up spec, never mid-refactor.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/accounting/posting/policies/opening-stock.policy.spec.ts
import { BadRequestException } from '@nestjs/common';
import { OpeningStockPolicy } from './opening-stock.policy';
import type { OpeningStockPostedIntent } from '../contracts/posting-intent';

function build(settings: Record<string, unknown> = { defaultInventoryAccountId: 'inv', defaultOpeningEquityAccountId: 'oe' }) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    return new OpeningStockPolicy(financialSettingsService);
}

const baseIntent: OpeningStockPostedIntent = {
    kind: 'OPENING_STOCK_POSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-01-01'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'warehouse-1',
    description: 'Opening inventory balance',
    totalValue: 5000,
};

describe('OpeningStockPolicy.buildLines', () => {
    it('debits Inventory and credits Opening Balance Equity', async () => {
        const lines = await build().buildLines(baseIntent);
        expect(lines).toEqual([
            { accountId: 'inv', debit: 5000, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'oe', debit: 0, credit: 5000, description: null, sortOrder: 1 },
        ]);
    });

    it('rounds to 4 decimal places, matching @db.Decimal(18,4)', async () => {
        const [inventoryLine] = await build().buildLines({ ...baseIntent, totalValue: 123.456789 });
        expect(inventoryLine!.debit).toBe(123.4568);
    });

    it('rejects when Inventory / Opening-Equity accounts are not configured', async () => {
        await expect(build({}).buildLines(baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm --filter @devloggers/api test -- opening-stock.policy.spec
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// apps/api/src/modules/accounting/posting/policies/opening-stock.policy.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { OpeningStockPostedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/**
 * Absorbs inventory.service.ts registerOpeningBalance's settings guard +
 * inventory-journal.ts's buildOpeningBalanceLines. Shares ReferenceType.OPENING_BALANCE
 * with OpeningBalancePolicy — see this task's Q1 note in the plan for why.
 */
@Injectable()
export class OpeningStockPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(intent: OpeningStockPostedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        if (!settings.defaultInventoryAccountId || !settings.defaultOpeningEquityAccountId) {
            throw new BadRequestException(
                'No default Inventory / Opening-Equity account configured in Financial Settings.',
            );
        }
        const amt = round(intent.totalValue);
        return [
            { accountId: settings.defaultInventoryAccountId, debit: amt, credit: 0, description: null, sortOrder: 0 },
            { accountId: settings.defaultOpeningEquityAccountId, debit: 0, credit: amt, description: null, sortOrder: 1 },
        ];
    }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @devloggers/api test -- opening-stock.policy.spec
```

Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/posting/policies/opening-stock.policy.ts apps/api/src/modules/accounting/posting/policies/opening-stock.policy.spec.ts
git commit -m "feat(accounting): add opening-stock posting policy, answer Q1 (Phase 1 task 1.4.7)"
```

---

## Task 10: Facade + registry + module

**Files:**
- Create: `apps/api/src/modules/accounting/posting/posting-policy.registry.ts`
- Create: `apps/api/src/modules/accounting/posting/accounting-posting.facade.ts`
- Create: `apps/api/src/modules/accounting/posting/posting.module.ts`
- Create: `apps/api/src/modules/accounting/posting/index.ts`
- Test: `apps/api/src/modules/accounting/posting/posting-policy.registry.spec.ts`
- Test: `apps/api/src/modules/accounting/posting/accounting-posting.facade.spec.ts`

**Interfaces:**
- Consumes: all 9 policy classes (Tasks 3-9), `JournalPostingService` (Task 2), `DocumentSequencesService` (existing), `assertFiscalPeriodOpen` (existing).
- Produces: `AccountingPostingFacade.record(tx, intent: PostingRecordIntent): Promise<{ journalEntryId: string }>`, `.reverse(tx, intent: PostingCancellationIntent): Promise<{ journalEntryId: string }>` — the only two methods every call-site migration (Tasks 11-16) will call. `index.ts` re-exports exactly these plus the intent/tx types — **the only legal import surface** for non-accounting modules per the phase goal.

- [ ] **Step 1: Write the registry's failing test**

```ts
// apps/api/src/modules/accounting/posting/posting-policy.registry.spec.ts
import { ReferenceType } from '@devloggers/db-prisma';
import { PostingPolicyRegistry } from './posting-policy.registry';
import { InvoicePostedPolicy } from './policies/invoice-posted.policy';
import { InvoiceCancelledPolicy } from './policies/invoice-cancelled.policy';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from './policies/payment-recorded.policy';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from './policies/expense-recorded.policy';
import { StockCountAdjustedPolicy } from './policies/stock-count-adjusted.policy';
import { OpeningBalancePolicy } from './policies/opening-balance.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';

function buildRegistry() {
    const fs = { getOrThrow: jest.fn().mockResolvedValue({}) } as any;
    return new PostingPolicyRegistry(
        new InvoicePostedPolicy(fs),
        new PaymentRecordedPolicy(fs),
        new ExpenseRecordedPolicy(),
        new StockCountAdjustedPolicy(fs),
        new OpeningBalancePolicy(fs),
        new OpeningStockPolicy(fs),
        new InvoiceCancelledPolicy(),
        new PaymentCancelledPolicy(),
        new ExpenseCancelledPolicy(),
    );
}

const RECORD_CASES: [PostingRecordIntent['kind'], ReferenceType][] = [
    ['INVOICE_POSTED', ReferenceType.INVOICE],
    ['PAYMENT_RECORDED', ReferenceType.PAYMENT],
    ['EXPENSE_RECORDED', ReferenceType.EXPENSE],
    ['STOCK_COUNT_ADJUSTED', ReferenceType.STOCK_COUNT],
    ['OPENING_BALANCE_POSTED', ReferenceType.OPENING_BALANCE],
    ['OPENING_STOCK_POSTED', ReferenceType.OPENING_BALANCE],
];

describe('PostingPolicyRegistry.resolvePosting', () => {
    it.each(RECORD_CASES)('%s resolves to %s', (kind, expected) => {
        const { referenceType } = buildRegistry().resolvePosting({ kind } as PostingRecordIntent);
        expect(referenceType).toBe(expected);
    });
});

const REVERSAL_CASES: [PostingCancellationIntent['kind'], ReferenceType][] = [
    ['INVOICE_CANCELLED', ReferenceType.INVOICE_CANCELLATION],
    ['PAYMENT_CANCELLED', ReferenceType.PAYMENT_CANCELLATION],
    ['EXPENSE_CANCELLED', ReferenceType.EXPENSE_CANCELLATION],
];

describe('PostingPolicyRegistry.resolveReversal', () => {
    it.each(REVERSAL_CASES)('%s resolves to %s', (kind, expected) => {
        const { referenceType } = buildRegistry().resolveReversal({ kind } as PostingCancellationIntent);
        expect(referenceType).toBe(expected);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm --filter @devloggers/api test -- posting-policy.registry.spec
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry**

```ts
// apps/api/src/modules/accounting/posting/posting-policy.registry.ts
import { Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import type { JournalLineDraft } from './contracts/journal-line-draft';
import type { PrismaTransactionClient } from './contracts/prisma-tx';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';
import { InvoicePostedPolicy } from './policies/invoice-posted.policy';
import { InvoiceCancelledPolicy } from './policies/invoice-cancelled.policy';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from './policies/payment-recorded.policy';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from './policies/expense-recorded.policy';
import { StockCountAdjustedPolicy } from './policies/stock-count-adjusted.policy';
import { OpeningBalancePolicy } from './policies/opening-balance.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';

function assertNever(value: never): never {
    throw new Error(`Unhandled posting intent kind: ${JSON.stringify(value)}`);
}

/**
 * kind -> policy dispatch table, exhaustively checked via `assertNever` so a
 * new PostingIntent member without a matching case is a compile error, not a
 * runtime surprise (spec task 1.3.4).
 */
@Injectable()
export class PostingPolicyRegistry {
    constructor(
        private readonly invoicePosted: InvoicePostedPolicy,
        private readonly paymentRecorded: PaymentRecordedPolicy,
        private readonly expenseRecorded: ExpenseRecordedPolicy,
        private readonly stockCountAdjusted: StockCountAdjustedPolicy,
        private readonly openingBalance: OpeningBalancePolicy,
        private readonly openingStock: OpeningStockPolicy,
        private readonly invoiceCancelled: InvoiceCancelledPolicy,
        private readonly paymentCancelled: PaymentCancelledPolicy,
        private readonly expenseCancelled: ExpenseCancelledPolicy,
    ) {}

    resolvePosting(intent: PostingRecordIntent): {
        referenceType: ReferenceType;
        buildLines: (tx: PrismaTransactionClient) => Promise<JournalLineDraft[]>;
    } {
        switch (intent.kind) {
            case 'INVOICE_POSTED':
                return { referenceType: ReferenceType.INVOICE, buildLines: (tx) => this.invoicePosted.buildLines(tx, intent) };
            case 'PAYMENT_RECORDED':
                return { referenceType: ReferenceType.PAYMENT, buildLines: (tx) => this.paymentRecorded.buildLines(tx, intent) };
            case 'EXPENSE_RECORDED':
                return { referenceType: ReferenceType.EXPENSE, buildLines: () => Promise.resolve(this.expenseRecorded.buildLines(intent)) };
            case 'STOCK_COUNT_ADJUSTED':
                return { referenceType: ReferenceType.STOCK_COUNT, buildLines: () => this.stockCountAdjusted.buildLines(intent) };
            case 'OPENING_BALANCE_POSTED':
                return { referenceType: ReferenceType.OPENING_BALANCE, buildLines: (tx) => this.openingBalance.buildLines(tx, intent) };
            case 'OPENING_STOCK_POSTED':
                return { referenceType: ReferenceType.OPENING_BALANCE, buildLines: () => this.openingStock.buildLines(intent) };
            default:
                return assertNever(intent);
        }
    }

    /** Reversal always mirrors the original entry's lines — no line-builder needed, only the referenceType. */
    resolveReversal(intent: PostingCancellationIntent): { referenceType: ReferenceType } {
        switch (intent.kind) {
            case 'INVOICE_CANCELLED':
                return { referenceType: this.invoiceCancelled.referenceType };
            case 'PAYMENT_CANCELLED':
                return { referenceType: this.paymentCancelled.referenceType };
            case 'EXPENSE_CANCELLED':
                return { referenceType: this.expenseCancelled.referenceType };
            default:
                return assertNever(intent);
        }
    }
}
```

- [ ] **Step 4: Run the registry test to confirm it passes**

```bash
pnpm --filter @devloggers/api test -- posting-policy.registry.spec
```

Expected: PASS, 9/9.

- [ ] **Step 5: Write the facade's failing test**

```ts
// apps/api/src/modules/accounting/posting/accounting-posting.facade.spec.ts
import { BadRequestException } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { AccountingPostingFacade } from './accounting-posting.facade';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';

function build() {
    const registry = {
        resolvePosting: jest.fn().mockReturnValue({
            referenceType: ReferenceType.INVOICE,
            buildLines: jest.fn().mockResolvedValue([{ accountId: 'a', debit: 100, credit: 0, description: null, sortOrder: 0 }]),
        }),
        resolveReversal: jest.fn().mockReturnValue({ referenceType: ReferenceType.INVOICE_CANCELLATION }),
    } as any;
    const journalPosting = {
        post: jest.fn().mockResolvedValue({ id: 'je-1' }),
        reverse: jest.fn().mockResolvedValue({ id: 'je-rev' }),
    } as any;
    const docSeqService = { getNextNumber: jest.fn().mockResolvedValue('JE-000001') } as any;
    return { facade: new AccountingPostingFacade(registry, journalPosting, docSeqService), registry, journalPosting, docSeqService };
}

const recordIntent: PostingRecordIntent = {
    kind: 'INVOICE_POSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-01'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'inv-1',
    description: 'Purchase invoice INV-001',
    direction: 'PURCHASE',
    partyId: 'party-1',
    netAmount: 1000,
    taxAmount: 0,
    total: 1000,
};

describe('AccountingPostingFacade.record', () => {
    it('checks the period, resolves the policy, allocates a number, then posts', async () => {
        const { facade, journalPosting, docSeqService } = build();
        const tx = {} as any;
        const result = await facade.record(tx, recordIntent);

        expect(docSeqService.getNextNumber).toHaveBeenCalledWith('t1', 'JOURNAL_ENTRY');
        expect(journalPosting.post).toHaveBeenCalledWith(tx, expect.objectContaining({
            tenantId: 't1',
            number: 'JE-000001',
            referenceType: ReferenceType.INVOICE,
            referenceId: 'inv-1',
            description: 'Purchase invoice INV-001',
            lines: [{ accountId: 'a', debit: 100, credit: 0, description: null, sortOrder: 0 }],
        }));
        expect(result).toEqual({ journalEntryId: 'je-1' });
    });

    it('rejects before allocating a JE number when the period is not OPEN', async () => {
        const { facade, docSeqService } = build();
        await expect(
            facade.record({} as any, { ...recordIntent, fiscalPeriodStatus: 'CLOSED' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(docSeqService.getNextNumber).not.toHaveBeenCalled();
    });
});

const cancelIntent: PostingCancellationIntent = {
    kind: 'INVOICE_CANCELLED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-05'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'inv-1',
    description: 'Reversal of invoice INV-001',
    originalEntryId: 'je-orig',
};

describe('AccountingPostingFacade.reverse', () => {
    it('resolves the reversal referenceType, allocates a number, then reverses', async () => {
        const { facade, journalPosting, docSeqService } = build();
        const tx = {} as any;
        const result = await facade.reverse(tx, cancelIntent);

        expect(docSeqService.getNextNumber).toHaveBeenCalledWith('t1', 'JOURNAL_ENTRY');
        expect(journalPosting.reverse).toHaveBeenCalledWith(tx, expect.objectContaining({
            tenantId: 't1',
            number: 'JE-000001',
            originalEntryId: 'je-orig',
            referenceType: ReferenceType.INVOICE_CANCELLATION,
            reversalDate: cancelIntent.date,
        }));
        expect(result).toEqual({ journalEntryId: 'je-rev' });
    });
});
```

- [ ] **Step 6: Run it to confirm it fails**

```bash
pnpm --filter @devloggers/api test -- accounting-posting.facade.spec
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement the facade**

```ts
// apps/api/src/modules/accounting/posting/accounting-posting.facade.ts
import { Injectable } from '@nestjs/common';
import { JournalPostingService } from '../accounts/services/journal-posting.service';
import { DocumentSequencesService } from '../document-sequences/services/document-sequences.service';
import { assertFiscalPeriodOpen } from '../accounts/utils/assert-period-open';
import { PostingPolicyRegistry } from './posting-policy.registry';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';
import type { PrismaTransactionClient } from './contracts/prisma-tx';

/**
 * The single entry point non-accounting modules use to reach the GL.
 * Deliberate step order — see this plan's "Deviations from the phase spec"
 * section, point 2 — is: period check -> policy builds lines (may reject on
 * missing GL config) -> allocate JE number -> persist. That order means a
 * rejection never burns a document-sequence number, matching every one of
 * the ten pre-Phase-1 call sites.
 */
@Injectable()
export class AccountingPostingFacade {
    constructor(
        private readonly registry: PostingPolicyRegistry,
        private readonly journalPosting: JournalPostingService,
        private readonly docSeqService: DocumentSequencesService,
    ) {}

    async record(tx: PrismaTransactionClient, intent: PostingRecordIntent): Promise<{ journalEntryId: string }> {
        assertFiscalPeriodOpen(intent.fiscalPeriodStatus);
        const { referenceType, buildLines } = this.registry.resolvePosting(intent);
        const lines = await buildLines(tx);
        const number = await this.docSeqService.getNextNumber(intent.tenantId, 'JOURNAL_ENTRY');

        const entry = await this.journalPosting.post(tx, {
            tenantId: intent.tenantId,
            number,
            date: intent.date,
            fiscalPeriodId: intent.fiscalPeriodId,
            fiscalPeriodStatus: intent.fiscalPeriodStatus,
            referenceType,
            referenceId: intent.referenceId,
            description: intent.description,
            exchangeRate: intent.exchangeRate,
            userId: intent.userId,
            lines,
        });
        return { journalEntryId: entry.id };
    }

    /** Reversal always mirrors the original entry — JournalPostingService.reverse does the mirroring. */
    async reverse(tx: PrismaTransactionClient, intent: PostingCancellationIntent): Promise<{ journalEntryId: string }> {
        assertFiscalPeriodOpen(intent.fiscalPeriodStatus);
        const { referenceType } = this.registry.resolveReversal(intent);
        const number = await this.docSeqService.getNextNumber(intent.tenantId, 'JOURNAL_ENTRY');

        const entry = await this.journalPosting.reverse(tx, {
            tenantId: intent.tenantId,
            number,
            originalEntryId: intent.originalEntryId,
            referenceType,
            referenceId: intent.referenceId,
            description: intent.description,
            exchangeRate: intent.exchangeRate,
            userId: intent.userId,
            reversalDate: intent.date,
            fiscalPeriodId: intent.fiscalPeriodId,
            fiscalPeriodStatus: intent.fiscalPeriodStatus,
        });
        return { journalEntryId: entry.id };
    }
}
```

- [ ] **Step 8: Run the facade test to confirm it passes**

```bash
pnpm --filter @devloggers/api test -- accounting-posting.facade.spec
```

Expected: PASS, 3/3.

- [ ] **Step 9: Wire the module**

```ts
// apps/api/src/modules/accounting/posting/posting.module.ts
import { Module } from '@nestjs/common';
import { FinancialSettingsModule } from '../financial-settings/financial-settings.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { JournalPostingService } from '../accounts/services/journal-posting.service';
import { InvoicePostedPolicy } from './policies/invoice-posted.policy';
import { InvoiceCancelledPolicy } from './policies/invoice-cancelled.policy';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from './policies/payment-recorded.policy';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from './policies/expense-recorded.policy';
import { StockCountAdjustedPolicy } from './policies/stock-count-adjusted.policy';
import { OpeningBalancePolicy } from './policies/opening-balance.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';
import { PostingPolicyRegistry } from './posting-policy.registry';
import { AccountingPostingFacade } from './accounting-posting.facade';

/**
 * Provides JournalPostingService itself (not imported via AccountsModule) —
 * JournalPostingService has no constructor dependencies, and giving it its
 * own registration here breaks what would otherwise be a circular import:
 * AccountsModule needs PostingModule (for OpeningBalancesService, Task 16)
 * and PostingModule would need AccountsModule (for JournalPostingService).
 * See Task 16 for the other half of this.
 */
@Module({
    imports: [FinancialSettingsModule, DocumentSequencesModule],
    providers: [
        JournalPostingService,
        InvoicePostedPolicy,
        InvoiceCancelledPolicy,
        PaymentRecordedPolicy,
        PaymentCancelledPolicy,
        ExpenseRecordedPolicy,
        ExpenseCancelledPolicy,
        StockCountAdjustedPolicy,
        OpeningBalancePolicy,
        OpeningStockPolicy,
        PostingPolicyRegistry,
        AccountingPostingFacade,
    ],
    exports: [AccountingPostingFacade],
})
export class PostingModule {}
```

- [ ] **Step 10: Write the barrel — the only legal import surface for non-accounting modules**

```ts
// apps/api/src/modules/accounting/posting/index.ts
export { AccountingPostingFacade } from './accounting-posting.facade';
export { PostingModule } from './posting.module';
export type {
    PostingIntent,
    PostingRecordIntent,
    PostingCancellationIntent,
    InvoicePostedIntent,
    InvoiceCancelledIntent,
    PaymentRecordedIntent,
    PaymentCancelledIntent,
    ExpenseRecordedIntent,
    ExpenseCancelledIntent,
    StockCountAdjustedIntent,
    OpeningBalancePostedIntent,
    OpeningStockPostedIntent,
} from './contracts/posting-intent';
export type { PrismaTransactionClient } from './contracts/prisma-tx';
```

- [ ] **Step 11: Full typecheck + test run**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm --filter @devloggers/api test
```

Expected: 0 typecheck errors; every suite passes, including all 7 policy specs, the registry spec, the facade spec, and the still-untouched golden masters.

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/modules/accounting/posting/posting-policy.registry.ts apps/api/src/modules/accounting/posting/posting-policy.registry.spec.ts apps/api/src/modules/accounting/posting/accounting-posting.facade.ts apps/api/src/modules/accounting/posting/accounting-posting.facade.spec.ts apps/api/src/modules/accounting/posting/posting.module.ts apps/api/src/modules/accounting/posting/index.ts
git commit -m "feat(accounting): add AccountingPostingFacade + policy registry + posting module (Phase 1 task 1.3)"
```

---

## Task 11: Migrate `invoice-posting.service.ts` (spec task 1.5.1)

**Files:**
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts`
- Modify: `apps/api/src/modules/invoicing/invoices/invoices.module.ts`
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.spec.ts`
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.perpetual.spec.ts`
- Delete: `apps/api/src/modules/invoicing/invoices/invoice-journal.ts`
- Delete: `apps/api/src/modules/invoicing/invoices/invoice-journal.spec.ts` (superseded by Task 3's `invoice-posted.policy.spec.ts`)

**Interfaces:**
- Consumes: `AccountingPostingFacade`, `InvoicePostedIntent`, `InvoiceCancelledIntent` from `../../accounting/posting`.
- Produces: `InvoicePostingService` constructor becomes `(prisma, inventoryService, postingFacade)` — three args instead of five. `invoices.module.ts` must provide `PostingModule` instead of `FinancialSettingsModule` + `AccountsModule`.

- [ ] **Step 1: Delete the moved journal-builder file and its spec**

```bash
git rm apps/api/src/modules/invoicing/invoices/invoice-journal.ts apps/api/src/modules/invoicing/invoices/invoice-journal.spec.ts
```

(Its logic now lives, tested, in `invoice-posted.policy.ts` / `.spec.ts` from Task 3.)

- [ ] **Step 2: Rewrite `invoice-posting.service.ts`**

```ts
// apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType, StockMovementType } from '@devloggers/db-prisma';
import { InventoryService } from '../../inventory/inventory.service';
import { AccountingPostingFacade, type InvoicePostedIntent, type InvoiceCancelledIntent } from '../../accounting/posting';
import { assertFiscalPeriodOpen } from '../../accounting/accounts/utils/assert-period-open';

@Injectable()
export class InvoicePostingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
        private readonly postingFacade: AccountingPostingFacade,
    ) {}

    async postPurchaseInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: { include: { item: { select: { itemType: true } } } },
                fiscalPeriod: { select: { status: true } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be posted');
        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);
        if (invoice.invoiceType.direction !== 'PURCHASE') throw new BadRequestException('This is not a purchase invoice');
        if (!invoice.warehouseId) throw new BadRequestException('Purchase invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);

        // Stock lines capitalized to Inventory (invoice-currency net); services stay as Purchase expense.
        const stockLines = invoice.invoiceType.affectsStock
            ? invoice.lines.filter((l) => l.item.itemType !== 'service')
            : [];
        const inventoryAmount = stockLines.reduce(
            (s, l) => s + (Number(l.total) - Number(l.taxAmount)),
            0,
        );

        const intent: InvoicePostedIntent = {
            kind: 'INVOICE_POSTED',
            tenantId,
            userId,
            date: invoice.date,
            fiscalPeriodId: invoice.fiscalPeriodId,
            fiscalPeriodStatus: invoice.fiscalPeriod?.status,
            exchangeRate,
            referenceId: invoice.id,
            description: `Purchase invoice ${invoice.number}`,
            direction: 'PURCHASE',
            partyId: invoice.partyId,
            netAmount,
            taxAmount: Number(invoice.taxAmount),
            total: Number(invoice.total),
            inventoryAmount,
        };

        return this.prisma.$transaction(async (tx) => {
            if (invoice.invoiceType.affectsStock) {
                for (const line of stockLines) {
                    await this.inventoryService.postMovementTx(tx, {
                        tenantId,
                        warehouseId: invoice.warehouseId!,
                        itemId: line.itemId,
                        fiscalPeriodId: invoice.fiscalPeriodId,
                        movementType: StockMovementType.PURCHASE,
                        quantity: Number(line.quantity),
                        unitCost: (Number(line.total) - Number(line.taxAmount)) / Number(line.quantity) * exchangeRate,
                        referenceType: 'invoice',
                        referenceId: invoice.id,
                        userId,
                    });
                    await tx.item.update({ where: { id: line.itemId }, data: { latestPurchasePrice: line.unitPrice } });
                }
            }

            await this.postingFacade.record(tx, intent);

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
    }

    async postSalesInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: { include: { item: { select: { itemType: true } } } },
                fiscalPeriod: { select: { status: true } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be posted');
        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);
        if (invoice.invoiceType.direction !== 'SALE') throw new BadRequestException('This is not a sales invoice');
        if (!invoice.warehouseId) throw new BadRequestException('Sales invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);

        // Stock lines drive COGS (base-currency averageCost); services have no COGS leg.
        const stockLines = invoice.invoiceType.affectsStock
            ? invoice.lines.filter((l) => l.item.itemType !== 'service')
            : [];

        return this.prisma.$transaction(async (tx) => {
            let cogsTotal = 0;
            for (const line of stockLines) {
                const balance = await tx.stockBalance.findUnique({
                    where: { tenantId_warehouseId_itemId: { tenantId, warehouseId: invoice.warehouseId!, itemId: line.itemId } },
                });
                const currentQty = balance ? Number(balance.quantity) : 0;
                const requestedQty = Number(line.quantity);
                if (currentQty < requestedQty) {
                    throw new BadRequestException(
                        `Insufficient stock for item "${line.itemId}". Available: ${currentQty}, Requested: ${requestedQty}`,
                    );
                }
                const unitCost = balance ? Number(balance.averageCost) : Number(line.unitPrice);
                cogsTotal += requestedQty * unitCost;
                await this.inventoryService.postMovementTx(tx, {
                    tenantId,
                    warehouseId: invoice.warehouseId!,
                    itemId: line.itemId,
                    fiscalPeriodId: invoice.fiscalPeriodId,
                    movementType: StockMovementType.SALE,
                    quantity: -requestedQty,
                    unitCost,
                    referenceType: 'invoice',
                    referenceId: invoice.id,
                    userId,
                });
            }

            const intent: InvoicePostedIntent = {
                kind: 'INVOICE_POSTED',
                tenantId,
                userId,
                date: invoice.date,
                fiscalPeriodId: invoice.fiscalPeriodId,
                fiscalPeriodStatus: invoice.fiscalPeriod?.status,
                exchangeRate,
                referenceId: invoice.id,
                description: `Sales invoice ${invoice.number}`,
                direction: 'SALE',
                partyId: invoice.partyId,
                netAmount,
                taxAmount: Number(invoice.taxAmount),
                total: Number(invoice.total),
                cogsTotal,
            };
            await this.postingFacade.record(tx, intent);

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
    }

    async cancelInvoice(tenantId: string, invoiceId: string, userId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: {
                invoiceType: true,
                lines: { include: { item: { select: { itemType: true } } } },
                paymentAllocations: true,
                fiscalPeriod: { select: { status: true } },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'POSTED') throw new BadRequestException('Only posted invoices can be cancelled');
        if (invoice.paymentAllocations.length > 0) {
            throw new BadRequestException(
                'Cannot cancel an invoice with payments allocated to it. Remove the payment allocations first.',
            );
        }

        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);

        const original = await this.prisma.journalEntry.findFirst({
            where: { tenantId, referenceType: ReferenceType.INVOICE, referenceId: invoice.id, status: 'POSTED' },
            orderBy: { createdAt: 'desc' },
        });
        if (!original) throw new BadRequestException('Original journal entry not found for this invoice.');

        const exchangeRate = Number(invoice.exchangeRate);
        const intent: InvoiceCancelledIntent = {
            kind: 'INVOICE_CANCELLED',
            tenantId,
            userId,
            date: invoice.date,
            fiscalPeriodId: invoice.fiscalPeriodId,
            fiscalPeriodStatus: invoice.fiscalPeriod?.status,
            exchangeRate,
            referenceId: invoice.id,
            description: `Reversal of invoice ${invoice.number}`,
            originalEntryId: original.id,
        };

        return this.prisma.$transaction(async (tx) => {
            // Reverse the original stock movements at their recorded cost (keeps averageCost exact).
            const originalMovements = await tx.stockMovement.findMany({
                where: { tenantId, referenceType: 'invoice', referenceId: invoice.id },
            });
            for (const mv of originalMovements) {
                await this.inventoryService.postMovementTx(tx, {
                    tenantId,
                    warehouseId: mv.warehouseId,
                    itemId: mv.itemId,
                    fiscalPeriodId: invoice.fiscalPeriodId,
                    movementType: StockMovementType.ADJUSTMENT,
                    quantity: -Number(mv.quantity),
                    unitCost: Number(mv.unitCost),
                    referenceType: 'invoice_cancellation',
                    referenceId: invoice.id,
                    notes: `Cancellation of invoice ${invoice.number}`,
                    userId,
                });
            }

            await this.postingFacade.reverse(tx, intent);

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
    }
}
```

Note what disappeared: the `party` include (the policy resolves the override via its own `tx.party.findFirst`), `FinancialSettingsService`/`DocumentSequencesService`/`JournalPostingService` imports, and every settings-guard `if (!xAccountId) throw ...` block — those live in `InvoicePostedPolicy` now (Task 3).

- [ ] **Step 3: Update `invoices.module.ts`**

```ts
// apps/api/src/modules/invoicing/invoices/invoices.module.ts
import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePostingService } from './invoice-posting.service';
import { InvoicePresenter } from './presenters/invoice.presenter';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { InventoryModule } from '../../inventory/inventory.module';
import { PostingModule } from '../../accounting/posting';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [DocumentSequencesModule, PostingModule, InventoryModule, PaymentsModule],
    controllers: [InvoicesController],
    providers: [InvoicesService, InvoicePostingService, InvoicePresenter, LocaleResolverService],
    exports: [InvoicesService, InvoicePostingService],
})
export class InvoicesModule {}
```

(`DocumentSequencesModule` stays — `InvoicesService`, not `InvoicePostingService`, uses it for the invoice's own number. `FinancialSettingsModule` and `AccountsModule` are gone; nothing in this module touches them directly anymore.)

- [ ] **Step 4: Rewrite `invoice-posting.service.spec.ts`'s dependency wiring**

Only the `buildDeps()` helper changes — every `it()` body is unchanged:

```ts
// apps/api/src/modules/invoicing/invoices/invoice-posting.service.spec.ts
import { InvoicePostingService } from './invoice-posting.service';
import { AccountingPostingFacade } from '../../accounting/posting';

function buildDeps() {
    const tx = {
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'CANCELLED' }) },
        stockMovement: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
        stockBalance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const postingFacade = {
        record: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }),
        reverse: jest.fn().mockResolvedValue({ journalEntryId: 'je-rev' }),
    } as unknown as AccountingPostingFacade;
    const prisma = {
        invoice: { findFirst: jest.fn() },
        journalEntry: { findFirst: jest.fn().mockResolvedValue({ id: 'je-orig' }) },
        $transaction: jest.fn((cb: any) => cb(tx)),
    } as any;
    const inventoryService = { postMovement: jest.fn(), postMovementTx: jest.fn() } as any;

    const service = new InvoicePostingService(prisma, inventoryService, postingFacade);
    return { service, prisma, tx, inventoryService, postingFacade };
}

const baseInvoice = {
    id: 'inv-1',
    status: 'POSTED',
    warehouseId: null,
    date: new Date('2026-04-14'),
    fiscalPeriodId: 'fp-1',
    number: 'SINV-00001',
    exchangeRate: 1,
    subtotal: 1000,
    discountAmount: 0,
    taxAmount: 0,
    total: 1000,
    partyId: 'party-1',
    invoiceType: { direction: 'SALE', affectsStock: false },
    lines: [],
    fiscalPeriod: { status: 'OPEN' },
};

describe('InvoicePostingService.cancelInvoice', () => {
    it('rejects cancelling an invoice with payments allocated to it', async () => {
        const { service, prisma } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, paymentAllocations: [{ id: 'alloc-1' }] });

        await expect(service.cancelInvoice('tenant-1', 'inv-1', 'user-1')).rejects.toThrow(/payments allocated/);
    });

    it('allows cancelling once no allocations remain', async () => {
        const { service, prisma, tx } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, paymentAllocations: [] });

        const result = await service.cancelInvoice('tenant-1', 'inv-1', 'user-1');

        expect(tx.invoice.update).toHaveBeenCalled();
        expect(result.status).toBe('CANCELLED');
    });

    it('reverses via postingFacade.reverse with the original entry id and reversal metadata', async () => {
        const { service, prisma, postingFacade } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, warehouseId: null, invoiceType: { direction: 'SALE', affectsStock: false }, paymentAllocations: [], fiscalPeriod: { status: 'OPEN' } });
        await service.cancelInvoice('tenant-1', 'inv-1', 'user-1');
        expect(postingFacade.reverse).toHaveBeenCalledTimes(1);
        const [, intent] = (postingFacade.reverse as jest.Mock).mock.calls[0];
        expect(intent.originalEntryId).toBe('je-orig');
        expect(intent.date).toEqual(baseInvoice.date);
        expect(intent.kind).toBe('INVOICE_CANCELLED');
        expect(intent.referenceId).toBe('inv-1');
    });

    it('reverses stock at the ORIGINAL recorded cost, not the invoice unitPrice', async () => {
        const { service, prisma, tx, inventoryService } = buildDeps();
        tx.stockMovement.findMany.mockResolvedValue([
            { warehouseId: 'w1', itemId: 'i1', quantity: -5, unitCost: 3 },
        ]);
        prisma.invoice.findFirst.mockResolvedValue({
            ...baseInvoice,
            warehouseId: 'w1',
            invoiceType: { direction: 'SALE', affectsStock: true },
            lines: [{ itemId: 'i1', quantity: 5, unitPrice: 100, item: { itemType: 'product' } }],
            paymentAllocations: [],
            fiscalPeriod: { status: 'OPEN' },
        });

        await service.cancelInvoice('tenant-1', 'inv-1', 'user-1');

        expect(inventoryService.postMovementTx).toHaveBeenCalledWith(
            tx,
            expect.objectContaining({ quantity: 5, unitCost: 3 }),
        );
    });
});
```

- [ ] **Step 5: Rewrite `invoice-posting.perpetual.spec.ts`'s dependency wiring**

```ts
// apps/api/src/modules/invoicing/invoices/invoice-posting.perpetual.spec.ts
import { InvoicePostingService } from './invoice-posting.service';
import { AccountingPostingFacade } from '../../accounting/posting';

function deps() {
    const tx = {
        stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
        stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'b', quantity: 100, averageCost: 3 }), create: jest.fn(), update: jest.fn() },
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv', status: 'POSTED' }) },
        item: { update: jest.fn() },
    };
    const prisma = { invoice: { findFirst: jest.fn() }, $transaction: jest.fn((cb: any) => cb(tx)) } as any;
    const inventory = { postMovementTx: jest.fn() } as any;
    const postingFacade = {
        record: jest.fn().mockResolvedValue({ journalEntryId: 'je' }),
        reverse: jest.fn().mockResolvedValue({ journalEntryId: 'je-r' }),
    } as unknown as AccountingPostingFacade;
    return { svc: new InvoicePostingService(prisma, inventory, postingFacade), prisma, tx, inventory, postingFacade };
}
const stockLine = { itemId: 'i1', quantity: 2, unitPrice: 300, total: 600, taxAmount: 0, item: { itemType: 'product' } };

describe('InvoicePostingService — perpetual', () => {
    it('purchase: capitalizes stock lines to Inventory and posts movement in-tx', async () => {
        const { svc, prisma, tx, inventory, postingFacade } = deps();
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'P1',
            exchangeRate: 1, subtotal: 600, discountAmount: 0, taxAmount: 0, total: 600, partyId: 'p1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [stockLine],
            fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postPurchaseInvoice('t', 'inv', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'PURCHASE', unitCost: 300 }));
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        expect(intent.inventoryAmount).toBe(600);
    });

    it('purchase: capitalizes stock at NET-of-discount cost so GL debit equals ledger cost', async () => {
        const { svc, prisma, tx, inventory, postingFacade } = deps();
        const discountedLine = { itemId: 'i1', quantity: 2, unitPrice: 300, total: 500, taxAmount: 0, item: { itemType: 'product' } };
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'P2',
            exchangeRate: 1, subtotal: 500, discountAmount: 0, taxAmount: 0, total: 500, partyId: 'p1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [discountedLine],
            fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postPurchaseInvoice('t', 'inv', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'PURCHASE', unitCost: 250 }));
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        expect(intent.inventoryAmount).toBe(500);
    });

    it('sale: computes a cogsTotal at averageCost with no rate applied', async () => {
        const { svc, prisma, postingFacade } = deps();
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'S1',
            exchangeRate: 1, subtotal: 1000, discountAmount: 0, taxAmount: 0, total: 1000, partyId: 'p1',
            invoiceType: { direction: 'SALE', affectsStock: true }, lines: [{ ...stockLine, quantity: 2, unitPrice: 500, total: 1000 }],
            fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postSalesInvoice('t', 'inv', 'u');
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        // avgCost 3 * qty 2 = 6
        expect(intent.cogsTotal).toBe(6);
    });

    it('rejects posting to a CLOSED period', async () => {
        const { svc, prisma } = deps();
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', number: 'S2',
            invoiceType: { direction: 'SALE', affectsStock: false }, lines: [],
            fiscalPeriod: { status: 'CLOSED' }, exchangeRate: 1, subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0, partyId: 'p1', date: new Date(),
        });
        await expect(svc.postSalesInvoice('t', 'inv', 'u')).rejects.toThrow(/closed/i);
    });
});
```

- [ ] **Step 6: Run the touched specs, then the full suite**

```bash
pnpm --filter @devloggers/api test -- invoice-posting.service.spec invoice-posting.perpetual.spec
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm --filter @devloggers/api test
```

Expected: touched specs pass; full typecheck 0 errors; **golden-master.spec.ts's purchase/sale/cancellation `describe` blocks still construct `InvoicePostingService` the old five-argument way and will now fail to compile** — this is expected and fixed in Task 17, not here. If you want a green full run before Task 17, temporarily skip golden-master.spec.ts's affected blocks; do not edit their expectations.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices/
git commit -m "refactor(invoicing): route invoice posting through AccountingPostingFacade (Phase 1 task 1.5.1)"
```

---

## Task 12: Migrate `payments.service.ts` (spec task 1.5.2)

**Files:**
- Modify: `apps/api/src/modules/invoicing/payments/payments.service.ts`
- Modify: `apps/api/src/modules/invoicing/payments/payments.module.ts`
- Modify: `apps/api/src/modules/invoicing/payments/payments.service.spec.ts`
- Delete: `apps/api/src/modules/invoicing/payments/payment-journal.ts` (superseded by Task 5's `payment-recorded.policy.ts`)

**Interfaces:**
- Consumes: `AccountingPostingFacade`, `PaymentRecordedIntent`, `PaymentCancelledIntent`.
- Produces: `PaymentsService` constructor becomes `(prisma, docSeqService, postingFacade)` — `docSeqService` stays (payments still generate their own RECEIPT/PAYMENT number), `financialSettingsService` and `journalPosting` are gone.

- [ ] **Step 1: Delete the moved journal-builder file**

```bash
git rm apps/api/src/modules/invoicing/payments/payment-journal.ts
```

(There was no standalone `payment-journal.spec.ts` — its cases are covered by Task 5's `payment-recorded.policy.spec.ts`.)

- [ ] **Step 2: Rewrite `payments.service.ts`'s `post` and `cancel` methods**

Only `post`, `cancel`, the constructor, and imports change — `findAll`, `findById`, `create`, `update`, `allocate`, `removeAllocation` are untouched. Full file:

```ts
// apps/api/src/modules/invoicing/payments/payments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType } from '@devloggers/db-prisma';
import { CreatePaymentDto, UpdatePaymentDto, AllocatePaymentDto } from './dto';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { AccountingPostingFacade, type PaymentRecordedIntent, type PaymentCancelledIntent } from '../../accounting/posting';

@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly postingFacade: AccountingPostingFacade,
    ) {}

    async findAll(tenantId: string, filters: { type?: string; status?: string; page?: number; limit?: number }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const where: any = { tenantId };
        if (filters.type) where.type = filters.type;
        if (filters.status) where.status = filters.status;

        const [data, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                include: {
                    cashbox: { select: { name: true, code: true } },
                    party: { select: { name: true } },
                    currency: { select: { code: true, symbol: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.payment.count({ where }),
        ]);
        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        const payment = await this.prisma.payment.findFirst({
            where: { id, tenantId },
            include: {
                cashbox: true,
                party: { select: { name: true, receivableAccountId: true, payableAccountId: true } },
                currency: true,
                fiscalPeriod: { select: { status: true } },
                allocations: { include: { invoice: { select: { number: true, total: true } } } },
            },
        });
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    async create(tenantId: string, userId: string, dto: CreatePaymentDto) {
        const docType = dto.type === 'RECEIPT' ? 'RECEIPT'
            : dto.type === 'PAYMENT' ? 'PAYMENT'
            : 'PAYMENT_ADJUSTMENT';

        const number = await this.docSeqService.getNextNumber(tenantId, docType);

        const payment = await this.prisma.payment.create({
            data: {
                tenantId,
                number,
                type: dto.type,
                date: new Date(dto.date),
                cashboxId: dto.cashboxId,
                partyId: dto.partyId,
                currencyId: dto.currencyId,
                fiscalPeriodId: dto.fiscalPeriodId,
                amount: dto.amount,
                exchangeRate: dto.exchangeRate ?? 1,
                unallocatedAmount: dto.amount,
                notes: dto.notes,
                createdBy: userId,
            },
        });

        if (dto.complete) {
            return this.post(tenantId, payment.id, userId);
        }

        return payment;
    }

    async update(tenantId: string, id: string, dto: UpdatePaymentDto) {
        const payment = await this.findById(tenantId, id);
        if (payment.status !== 'DRAFT') throw new BadRequestException('Only draft payments can be edited');
        const data: any = {};
        if (dto.date) data.date = new Date(dto.date);
        if (dto.cashboxId) data.cashboxId = dto.cashboxId;
        if (dto.partyId !== undefined) data.partyId = dto.partyId;
        if (dto.notes !== undefined) data.notes = dto.notes;
        if (dto.amount) {
            data.amount = dto.amount;
            data.unallocatedAmount = dto.amount;
        }
        return this.prisma.payment.update({ where: { id }, data });
    }

    async post(tenantId: string, id: string, userId: string) {
        const payment = await this.findById(tenantId, id);
        if (payment.status !== 'DRAFT') throw new BadRequestException('Only draft payments can be posted');

        const cashbox = await this.prisma.cashbox.findUnique({ where: { id: payment.cashboxId } });
        if (!cashbox?.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked GL account; cannot post the payment');
        }

        const exchangeRate = Number(payment.exchangeRate);
        const amount = Number(payment.amount);
        const isReceipt = payment.type === 'RECEIPT';
        const balanceDelta = isReceipt ? amount : -amount;

        const intent: PaymentRecordedIntent = {
            kind: 'PAYMENT_RECORDED',
            tenantId,
            userId,
            date: payment.date,
            fiscalPeriodId: payment.fiscalPeriodId,
            fiscalPeriodStatus: payment.fiscalPeriod?.status,
            exchangeRate,
            referenceId: payment.id,
            description: `Payment ${payment.number}`,
            type: payment.type as 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT',
            partyId: payment.partyId ?? null,
            amount,
            cashboxAccountId: cashbox.linkedAccountId,
        };

        await this.prisma.$transaction(async (tx) => {
            await this.postingFacade.record(tx, intent);

            await tx.cashbox.update({
                where: { id: payment.cashboxId },
                data: { balance: { increment: balanceDelta } },
            });

            await tx.payment.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
            });
        });

        return this.findById(tenantId, id);
    }

    async cancel(tenantId: string, id: string, userId: string) {
        const payment = await this.findById(tenantId, id);
        if (payment.status !== 'POSTED') throw new BadRequestException('Only posted payments can be cancelled');
        if (Number(payment.allocatedAmount) > 0) {
            throw new BadRequestException('Cannot cancel a payment with existing allocations. Remove allocations first.');
        }

        const cashbox = await this.prisma.cashbox.findUnique({ where: { id: payment.cashboxId } });
        if (!cashbox?.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked GL account; cannot cancel the payment');
        }

        const isReceipt = payment.type === 'RECEIPT';
        const exchangeRate = Number(payment.exchangeRate);
        const amount = Number(payment.amount);
        const reverseDelta = isReceipt ? -amount : amount;

        const original = await this.prisma.journalEntry.findFirst({
            where: { tenantId, referenceType: ReferenceType.PAYMENT, referenceId: payment.id, status: 'POSTED' },
        });
        if (!original) {
            throw new BadRequestException('Original journal entry not found for this payment.');
        }

        const intent: PaymentCancelledIntent = {
            kind: 'PAYMENT_CANCELLED',
            tenantId,
            userId,
            date: payment.date,
            fiscalPeriodId: payment.fiscalPeriodId,
            fiscalPeriodStatus: payment.fiscalPeriod?.status,
            exchangeRate,
            referenceId: payment.id,
            description: `Reversal of payment ${payment.number}`,
            originalEntryId: original.id,
        };

        await this.prisma.$transaction(async (tx) => {
            await this.postingFacade.reverse(tx, intent);

            await tx.cashbox.update({
                where: { id: payment.cashboxId },
                data: { balance: { increment: reverseDelta } },
            });

            await tx.payment.update({
                where: { id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
            });
        });

        return this.findById(tenantId, id);
    }

    async allocate(tenantId: string, paymentId: string, dto: AllocatePaymentDto) {
        const payment = await this.findById(tenantId, paymentId);
        if (payment.status !== 'POSTED') throw new BadRequestException('Only posted payments can be allocated');

        const unallocated = Number(payment.unallocatedAmount);
        if (dto.amount > unallocated) {
            throw new BadRequestException(`Allocation amount (${dto.amount}) exceeds unallocated balance (${unallocated})`);
        }

        const invoice = await this.prisma.invoice.findFirst({ where: { id: dto.invoiceId, tenantId } });
        if (!invoice) throw new NotFoundException('Invoice not found');

        if (payment.partyId && payment.partyId !== invoice.partyId) {
            throw new BadRequestException('Payment and invoice belong to different parties');
        }
        if (payment.currencyId !== invoice.currencyId) {
            throw new BadRequestException('Payment and invoice currencies do not match');
        }

        const allocatedAgg = await this.prisma.paymentAllocation.aggregate({
            where: { tenantId, invoiceId: dto.invoiceId },
            _sum: { amount: true },
        });
        const invoiceRemaining = Number(invoice.total) - Number(allocatedAgg._sum.amount ?? 0);
        if (dto.amount > invoiceRemaining) {
            throw new BadRequestException(`Allocation amount (${dto.amount}) exceeds the invoice's remaining balance (${invoiceRemaining})`);
        }

        return this.prisma.$transaction(async (tx) => {
            const allocation = await tx.paymentAllocation.create({
                data: { tenantId, paymentId, invoiceId: dto.invoiceId, amount: dto.amount },
            });

            await tx.payment.update({
                where: { id: paymentId },
                data: {
                    allocatedAmount: { increment: dto.amount },
                    unallocatedAmount: { decrement: dto.amount },
                },
            });

            return allocation;
        });
    }

    async removeAllocation(tenantId: string, paymentId: string, allocationId: string) {
        const allocation = await this.prisma.paymentAllocation.findFirst({
            where: { id: allocationId, paymentId, tenantId },
        });
        if (!allocation) throw new NotFoundException('Allocation not found');

        return this.prisma.$transaction(async (tx) => {
            await tx.paymentAllocation.delete({ where: { id: allocationId } });
            await tx.payment.update({
                where: { id: paymentId },
                data: {
                    allocatedAmount: { decrement: Number(allocation.amount) },
                    unallocatedAmount: { increment: Number(allocation.amount) },
                },
            });
        });
    }
}
```

- [ ] **Step 3: Update `payments.module.ts`**

```ts
// apps/api/src/modules/invoicing/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { PostingModule } from '../../accounting/posting';

@Module({
    imports: [DocumentSequencesModule, PostingModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule {}
```

- [ ] **Step 4: Update `payments.service.spec.ts`'s `buildDeps()` helper**

Only the helper changes; every `it()` body is unchanged:

```ts
// apps/api/src/modules/invoicing/payments/payments.service.spec.ts — only buildDeps() shown, rest unchanged
import { PaymentsService } from './payments.service';
import { AccountingPostingFacade } from '../../accounting/posting';

function buildDeps() {
    const tx = {
        paymentAllocation: { create: jest.fn().mockResolvedValue({ id: 'alloc-1' }) },
        payment: { update: jest.fn().mockResolvedValue({}) },
        cashbox: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
        payment: { findFirst: jest.fn(), create: jest.fn() },
        invoice: { findFirst: jest.fn() },
        cashbox: { findUnique: jest.fn().mockResolvedValue({ linkedAccountId: 'cashbox-acct' }) },
        journalEntry: { findFirst: jest.fn().mockResolvedValue({ id: 'je-orig' }) },
        paymentAllocation: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
        $transaction: jest.fn((cb: any) => cb(tx)),
    } as any;
    const docSeqService = { getNextNumber: jest.fn().mockResolvedValue('REC-00001') } as any;
    const postingFacade = {
        record: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }),
        reverse: jest.fn().mockResolvedValue({ journalEntryId: 'je-r' }),
    } as unknown as AccountingPostingFacade;

    const service = new PaymentsService(prisma, docSeqService, postingFacade);
    return { service, prisma, tx, docSeqService, postingFacade };
}
```

Keep every existing `describe('PaymentsService.allocate', ...)` and `describe('PaymentsService.create', ...)` block byte-identical below this helper — none of them touch `post`/`cancel`, so none reference the removed `financialSettingsService`/`journalPosting` variables.

- [ ] **Step 5: Run the touched spec**

```bash
pnpm --filter @devloggers/api test -- payments.service.spec
pnpm --filter @devloggers/api exec tsc --noEmit
```

Expected: PASS; 0 typecheck errors (golden-master.spec.ts's payment `describe` blocks still fail to compile until Task 17 — expected, same as Task 11).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/invoicing/payments/
git commit -m "refactor(invoicing): route payment posting through AccountingPostingFacade (Phase 1 task 1.5.2)"
```

---

## Task 13: Migrate `expenses.service.ts` (spec task 1.5.3)

**Files:**
- Modify: `apps/api/src/modules/invoicing/expenses/expenses.service.ts`
- Modify: `apps/api/src/modules/invoicing/expenses/expenses.module.ts`
- Delete: `apps/api/src/modules/invoicing/expenses/expense-journal.ts`
- Delete: `apps/api/src/modules/invoicing/expenses/expense-journal.spec.ts` (superseded by Task 6's `expense-recorded.policy.spec.ts`)

There is no pre-existing `expenses.service.ts` unit spec to update (only the now-deleted `expense-journal.spec.ts` tested pure builder logic).

**Interfaces:**
- Consumes: `AccountingPostingFacade`, `ExpenseRecordedIntent`, `ExpenseCancelledIntent`.
- Produces: `ExpensesService` constructor becomes `(prisma, docSeqService, postingFacade)` — `docSeqService` stays (EXPENSE numbering), `journalPosting` is gone. `assertAccountFitsSlot`'s item/cashbox type validation **stays in this file** (it's request-shape validation the caller already owns, not GL policy — the policy trusts already-validated `accountId`s).

- [ ] **Step 1: Delete the moved journal-builder file and its spec**

```bash
git rm apps/api/src/modules/invoicing/expenses/expense-journal.ts apps/api/src/modules/invoicing/expenses/expense-journal.spec.ts
```

- [ ] **Step 2: Rewrite `expenses.service.ts`'s `post` and `cancel` methods**

Only `post`, `cancel`, the constructor, and imports change — `findAll`, `findById`, `create`, `update`, `remove`, `mapItems` are untouched. Full file:

```ts
// apps/api/src/modules/invoicing/expenses/expenses.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType } from '@devloggers/db-prisma';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseItemDto } from './dto';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { AccountingPostingFacade, type ExpenseRecordedIntent, type ExpenseCancelledIntent } from '../../accounting/posting';
import { assertAccountFitsSlot } from '../../accounting/accounts/utils/assert-account-fits-slot';

@Injectable()
export class ExpensesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly postingFacade: AccountingPostingFacade,
    ) {}

    async findAll(tenantId: string, filters: { status?: string; page?: number; limit?: number }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const where: any = { tenantId };
        if (filters.status) where.status = filters.status;

        const [data, total] = await Promise.all([
            this.prisma.expense.findMany({
                where,
                include: {
                    cashbox: { select: { name: true, code: true } },
                    currency: { select: { code: true, symbol: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.expense.count({ where }),
        ]);
        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        const expense = await this.prisma.expense.findFirst({
            where: { id, tenantId },
            include: {
                cashbox: true,
                currency: true,
                fiscalPeriod: { select: { status: true } },
                items: { orderBy: { sortOrder: 'asc' } },
            },
        });
        if (!expense) throw new NotFoundException('Expense not found');
        return expense;
    }

    async create(tenantId: string, userId: string, dto: CreateExpenseDto) {
        const number = await this.docSeqService.getNextNumber(tenantId, 'EXPENSE');
        const totalAmount = dto.items.reduce((s, it) => s + it.amount, 0);

        return this.prisma.expense.create({
            data: {
                tenantId,
                number,
                date: new Date(dto.date),
                cashboxId: dto.cashboxId,
                currencyId: dto.currencyId,
                fiscalPeriodId: dto.fiscalPeriodId,
                totalAmount,
                exchangeRate: dto.exchangeRate ?? 1,
                notes: dto.notes,
                createdBy: userId,
                items: { create: this.mapItems(tenantId, dto.items) },
            },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateExpenseDto) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'DRAFT') throw new BadRequestException('Only draft expenses can be edited');

        const data: any = {};
        if (dto.date) data.date = new Date(dto.date);
        if (dto.cashboxId) data.cashboxId = dto.cashboxId;
        if (dto.currencyId) data.currencyId = dto.currencyId;
        if (dto.fiscalPeriodId) data.fiscalPeriodId = dto.fiscalPeriodId;
        if (dto.notes !== undefined) data.notes = dto.notes;

        return this.prisma.$transaction(async (tx) => {
            if (dto.items) {
                await tx.expenseItem.deleteMany({ where: { expenseId: id } });
                data.items = { create: this.mapItems(tenantId, dto.items) };
                data.totalAmount = dto.items.reduce((s, it) => s + it.amount, 0);
            }
            return tx.expense.update({
                where: { id },
                data,
                include: { items: { orderBy: { sortOrder: 'asc' } } },
            });
        });
    }

    async remove(tenantId: string, id: string) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'DRAFT') throw new BadRequestException('Only draft expenses can be deleted');
        await this.prisma.expense.delete({ where: { id } });
    }

    async post(tenantId: string, id: string, userId: string) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'DRAFT') throw new BadRequestException('Only draft expenses can be posted');
        if (expense.items.length === 0) throw new BadRequestException('Expense must have at least one item');
        if (!expense.cashbox.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked account; cannot post the expense');
        }

        const exchangeRate = Number(expense.exchangeRate);
        const totalAmount = Number(expense.totalAmount);

        const accountIds = Array.from(new Set([
            ...expense.items.map((i) => i.accountId),
            expense.cashbox.linkedAccountId,
        ]));
        const accounts = await this.prisma.chartOfAccount.findMany({
            where: { id: { in: accountIds }, tenantId },
            select: { id: true, code: true, type: true, isPostable: true, isContra: true, deletedAt: true, isActive: true },
        });
        const byId = new Map(accounts.map((a) => [a.id, a]));
        for (const item of expense.items) {
            assertAccountFitsSlot(byId.get(item.accountId) ?? null, 'EXPENSE' as any, 'defaultPurchase');
        }
        assertAccountFitsSlot(byId.get(expense.cashbox.linkedAccountId) ?? null, 'ASSET' as any, 'defaultReceivable');

        const intent: ExpenseRecordedIntent = {
            kind: 'EXPENSE_RECORDED',
            tenantId,
            userId,
            date: expense.date,
            fiscalPeriodId: expense.fiscalPeriodId,
            fiscalPeriodStatus: expense.fiscalPeriod?.status,
            exchangeRate,
            referenceId: expense.id,
            description: `Expense ${expense.number}`,
            cashboxAccountId: expense.cashbox.linkedAccountId,
            totalAmount: totalAmount * exchangeRate,
            items: expense.items.map((it) => ({
                accountId: it.accountId,
                amount: Number(it.amount) * exchangeRate,
                description: it.description,
                sortOrder: it.sortOrder,
            })),
        };

        await this.prisma.$transaction(async (tx) => {
            const { journalEntryId } = await this.postingFacade.record(tx, intent);

            await tx.cashbox.update({
                where: { id: expense.cashboxId },
                data: { balance: { decrement: totalAmount } },
            });

            await tx.expense.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId, journalEntryId },
            });
        });

        return this.findById(tenantId, id);
    }

    async cancel(tenantId: string, id: string, userId: string) {
        const expense = await this.findById(tenantId, id);
        if (expense.status !== 'POSTED') throw new BadRequestException('Only posted expenses can be cancelled');
        if (!expense.cashbox.linkedAccountId) {
            throw new BadRequestException('Cashbox has no linked account; cannot cancel the expense');
        }

        const original = await this.prisma.journalEntry.findFirst({
            where: { tenantId, referenceType: ReferenceType.EXPENSE, referenceId: expense.id, status: 'POSTED' },
        });
        if (!original) {
            throw new BadRequestException('Original journal entry not found for this expense.');
        }

        const exchangeRate = Number(expense.exchangeRate);
        const totalAmount = Number(expense.totalAmount);

        const intent: ExpenseCancelledIntent = {
            kind: 'EXPENSE_CANCELLED',
            tenantId,
            userId,
            date: expense.date,
            fiscalPeriodId: expense.fiscalPeriodId,
            fiscalPeriodStatus: expense.fiscalPeriod?.status,
            exchangeRate,
            referenceId: expense.id,
            description: `Reversal of expense ${expense.number}`,
            originalEntryId: original.id,
        };

        await this.prisma.$transaction(async (tx) => {
            await this.postingFacade.reverse(tx, intent);

            await tx.cashbox.update({
                where: { id: expense.cashboxId },
                data: { balance: { increment: totalAmount } },
            });

            await tx.expense.update({
                where: { id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
            });
        });

        return this.findById(tenantId, id);
    }

    private mapItems(tenantId: string, items: CreateExpenseItemDto[]) {
        return items.map((it, i) => ({
            tenantId,
            accountId: it.accountId,
            description: it.description,
            amount: it.amount,
            notes: it.notes,
            sortOrder: it.sortOrder ?? i,
        }));
    }
}
```

Note: `journalEntryId` for the `expense.journalEntryId` column now comes from `postingFacade.record()`'s return value instead of the old `journalPosting.post()` return value — same shape (`{ journalEntryId: string }` vs the old `{ id: string }`), just renamed at the facade boundary; behaviour identical.

- [ ] **Step 3: Update `expenses.module.ts`**

```ts
// apps/api/src/modules/invoicing/expenses/expenses.module.ts
import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { PostingModule } from '../../accounting/posting';

@Module({
    imports: [DocumentSequencesModule, PostingModule],
    controllers: [ExpensesController],
    providers: [ExpensesService],
    exports: [ExpensesService],
})
export class ExpensesModule {}
```

- [ ] **Step 4: Typecheck (no existing service spec to run for this file)**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
```

Expected: 0 errors except golden-master.spec.ts's expense `describe` block, fixed in Task 17.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/invoicing/expenses/
git commit -m "refactor(invoicing): route expense posting through AccountingPostingFacade (Phase 1 task 1.5.3)"
```

---

## Task 14: Migrate `stock-counts.service.ts` (spec task 1.5.4)

**Files:**
- Modify: `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts`
- Modify: `apps/api/src/modules/inventory/stock-counts/stock-counts.module.ts`
- Modify: `apps/api/src/modules/inventory/stock-counts/stock-counts.service.spec.ts`

**Interfaces:**
- Consumes: `AccountingPostingFacade`, `StockCountAdjustedIntent`.
- Produces: `StockCountsService` constructor becomes `(prisma, inventoryService, docSeqService, stockCountsRepository, stockCountPresenter, eventEmitter, postingFacade)` — `financialSettingsService` and `journalPosting` are gone, replaced by one `postingFacade`.

- [ ] **Step 1: Rewrite `stock-counts.service.ts`'s `post` method + constructor**

Only `post`, the constructor, and imports change — `findAll`, `findById`, `create` are untouched. Full file:

```ts
// apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StockMovementType } from '@devloggers/db-prisma';
import { InventoryService } from '../inventory.service';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { AccountingPostingFacade, type StockCountAdjustedIntent } from '../../accounting/posting';
import { StockCountsRepository } from './repositories/stock-counts.repository';
import { StockCountPresenter } from './presenters/stock-count.presenter';
import { StockCountCreatedEvent, StockCountPostedEvent } from './events/stock-count.events';
import { assertFiscalPeriodOpen } from '../../accounting/accounts/utils/assert-period-open';

@Injectable()
export class StockCountsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly stockCountsRepository: StockCountsRepository,
        private readonly stockCountPresenter: StockCountPresenter,
        private readonly eventEmitter: EventEmitter2,
        private readonly postingFacade: AccountingPostingFacade,
    ) {}

    async findAll(tenantId: string, page = 1, limit = 50) {
        const result = await this.stockCountsRepository.findAll(tenantId, page, limit);
        return {
            data: this.stockCountPresenter.toListResponseList(result.data),
            total: result.total,
            page: result.page,
            limit: result.limit,
        };
    }

    async findById(tenantId: string, id: string) {
        const count = await this.stockCountsRepository.findById(tenantId, id);
        if (!count) throw new NotFoundException('Stock count not found');
        return this.stockCountPresenter.toDetailResponse(count);
    }

    async create(tenantId: string, userId: string, dto: {
        date: string; warehouseId: string; fiscalPeriodId: string; notes?: string;
        lines: { itemId: string; countedQuantity: number; notes?: string }[];
    }) {
        const number = await this.docSeqService.getNextNumber(tenantId, 'STOCK_COUNT');

        const processedLines = await Promise.all(dto.lines.map(async (line) => {
            const balance = await this.prisma.stockBalance.findUnique({
                where: {
                    tenantId_warehouseId_itemId: {
                        tenantId,
                        warehouseId: dto.warehouseId,
                        itemId: line.itemId,
                    },
                },
            });

            const systemQty = balance ? Number(balance.quantity) : 0;
            const difference = line.countedQuantity - systemQty;

            return {
                tenantId,
                itemId: line.itemId,
                systemQuantity: systemQty,
                countedQuantity: line.countedQuantity,
                difference,
                notes: line.notes,
            };
        }));

        const created = await this.prisma.stockCount.create({
            data: {
                tenantId,
                number,
                date: new Date(dto.date),
                warehouseId: dto.warehouseId,
                fiscalPeriodId: dto.fiscalPeriodId,
                notes: dto.notes,
                createdBy: userId,
                lines: { create: processedLines },
            },
            include: { lines: true, warehouse: true },
        });

        this.eventEmitter.emit(StockCountCreatedEvent.NAME, new StockCountCreatedEvent(tenantId, 'stock-count', created as any));
        return this.stockCountPresenter.toDetailResponse(created);
    }

    async post(tenantId: string, id: string, userId: string) {
        const stockCount = await this.stockCountsRepository.findById(tenantId, id);
        if (!stockCount) throw new NotFoundException('Stock count not found');
        if (stockCount.status !== 'DRAFT') throw new BadRequestException('Only draft stock counts can be posted');
        assertFiscalPeriodOpen((stockCount as any).fiscalPeriod?.status);

        const itemTypes = await this.prisma.item.findMany({
            where: { tenantId, id: { in: stockCount.lines.map((l) => l.itemId) } },
            select: { id: true, itemType: true },
        });
        const itemTypeMap = new Map(itemTypes.map((i) => [i.id, i.itemType]));

        return this.prisma.$transaction(async (tx) => {
            let netVariance = 0;
            for (const line of stockCount.lines) {
                const diff = Number(line.difference);
                if (diff === 0 || itemTypeMap.get(line.itemId) === 'service') continue;
                const balance = await tx.stockBalance.findUnique({
                    where: { tenantId_warehouseId_itemId: { tenantId, warehouseId: stockCount.warehouseId, itemId: line.itemId } },
                });
                const unitCost = balance ? Number(balance.averageCost) : 0;
                netVariance += diff * unitCost;
                await this.inventoryService.postMovementTx(tx, {
                    tenantId,
                    warehouseId: stockCount.warehouseId,
                    itemId: line.itemId,
                    fiscalPeriodId: stockCount.fiscalPeriodId,
                    movementType: StockMovementType.STOCK_COUNT,
                    quantity: diff,
                    unitCost,
                    referenceType: 'stock_count',
                    referenceId: id,
                    notes: `Stock count adjustment: ${stockCount.number}`,
                    userId,
                });
            }

            if (netVariance !== 0) {
                const intent: StockCountAdjustedIntent = {
                    kind: 'STOCK_COUNT_ADJUSTED',
                    tenantId,
                    userId,
                    date: new Date(),
                    fiscalPeriodId: stockCount.fiscalPeriodId,
                    fiscalPeriodStatus: (stockCount as any).fiscalPeriod?.status,
                    exchangeRate: 1,
                    referenceId: id,
                    description: `Stock count variance ${stockCount.number}`,
                    netVariance,
                };
                await this.postingFacade.record(tx, intent);
            }

            const updated = await tx.stockCount.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
                include: { lines: true, warehouse: true },
            });
            this.eventEmitter.emit(StockCountPostedEvent.NAME, new StockCountPostedEvent(tenantId, 'stock-count', updated as any, stockCount as any));
            return this.stockCountPresenter.toDetailResponse(updated);
        });
    }
}
```

(The `financialSettingsService.getOrThrow` + missing-account guard that used to run before the transaction now lives inside `StockCountAdjustedPolicy.buildLines`, Task 7 — same guarantee, since it still only runs when `netVariance !== 0`, exactly as before.)

- [ ] **Step 2: Update `stock-counts.module.ts`**

```ts
// apps/api/src/modules/inventory/stock-counts/stock-counts.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { StockCountsController } from './stock-counts.controller';
import { StockCountsService } from './stock-counts.service';
import { StockCountsRepository } from './repositories/stock-counts.repository';
import { StockCountPresenter } from './presenters/stock-count.presenter';
import { InventoryModule } from '../inventory.module';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { PostingModule } from '../../accounting/posting';

@Module({
    imports: [PrismaModule, InventoryModule, DocumentSequencesModule, PostingModule],
    controllers: [StockCountsController],
    providers: [StockCountsService, StockCountsRepository, StockCountPresenter],
    exports: [StockCountsService],
})
export class StockCountsModule {}
```

- [ ] **Step 3: Update `stock-counts.service.spec.ts`'s `build()` helper**

```ts
// apps/api/src/modules/inventory/stock-counts/stock-counts.service.spec.ts
import { StockCountsService } from './stock-counts.service';
import { AccountingPostingFacade } from '../../accounting/posting';

function build() {
    const tx = {
        stockMovement: { create: jest.fn() },
        stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'b', quantity: 5, averageCost: 10 }), create: jest.fn(), update: jest.fn() },
        stockCount: { update: jest.fn().mockResolvedValue({ id: 'sc', lines: [], warehouse: {} }) },
    };
    const prisma = { item: { findMany: jest.fn().mockResolvedValue([{ id: 'i1', itemType: 'product' }]) }, $transaction: jest.fn((cb: any) => cb(tx)) } as any;
    const inventory = { postMovementTx: jest.fn() } as any;
    const seq = { getNextNumber: jest.fn().mockResolvedValue('JE-1') } as any;
    const repo = { findById: jest.fn() } as any;
    const presenter = { toDetailResponse: jest.fn((x) => x) } as any;
    const emitter = { emit: jest.fn() } as any;
    const postingFacade = {
        record: jest.fn().mockResolvedValue({ journalEntryId: 'je' }),
        reverse: jest.fn(),
    } as unknown as AccountingPostingFacade;
    const svc = new StockCountsService(prisma, inventory, seq, repo, presenter, emitter, postingFacade);
    return { svc, prisma, tx, inventory, repo, postingFacade };
}

describe('StockCountsService.post', () => {
    it('values the movement at averageCost and posts a variance JE', async () => {
        const { svc, tx, inventory, repo, postingFacade } = build();
        repo.findById.mockResolvedValue({
            id: 'sc', number: 'SC1', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp',
            fiscalPeriod: { status: 'OPEN' }, lines: [{ itemId: 'i1', difference: 3 }],
        });
        await svc.post('t', 'sc', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'STOCK_COUNT', quantity: 3, unitCost: 10 }));
        expect(postingFacade.record).toHaveBeenCalledTimes(1);
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        // surplus 3 * 10 = 30
        expect(intent.netVariance).toBe(30);
    });

    it('rejects posting to a LOCKED period', async () => {
        const { svc, repo } = build();
        repo.findById.mockResolvedValue({ id: 'sc', status: 'DRAFT', fiscalPeriod: { status: 'LOCKED' }, lines: [] });
        await expect(svc.post('t', 'sc', 'u')).rejects.toThrow(/locked/i);
    });
});
```

- [ ] **Step 4: Run the touched spec**

```bash
pnpm --filter @devloggers/api test -- stock-counts.service.spec
pnpm --filter @devloggers/api exec tsc --noEmit
```

Expected: PASS, 2/2; 0 typecheck errors outside golden-master.spec.ts (fixed Task 17 — stock-counts isn't covered by golden masters at the service level, so no golden-master fixture needs touching for this file specifically).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/inventory/stock-counts/
git commit -m "refactor(inventory): route stock-count variance posting through AccountingPostingFacade (Phase 1 task 1.5.4)"
```

---

## Task 15: Migrate `inventory.service.ts` (spec task 1.5.5)

**Files:**
- Modify: `apps/api/src/modules/inventory/inventory.service.ts`
- Modify: `apps/api/src/modules/inventory/inventory.module.ts`
- Modify: `apps/api/src/modules/inventory/inventory.opening.spec.ts`
- Test: `apps/api/src/modules/inventory/inventory.service.spec.ts` (unaffected — it only exercises `postMovementTx`, whose signature was already finalized in Task 2)

**Interfaces:**
- Consumes: `AccountingPostingFacade`, `OpeningStockPostedIntent`.
- Produces: `InventoryService` constructor becomes `(prisma, inventoryRepository, inventoryPresenter, postingFacade)` — `financialSettingsService`, `docSeqService`, `journalPosting` are all gone (none of them were used anywhere else in this file — confirmed by grep, `registerOpeningBalance` was their only caller).

- [ ] **Step 1: Rewrite `inventory.service.ts`**

```ts
// apps/api/src/modules/inventory/inventory.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StockMovementType } from '@devloggers/db-prisma';
import { PostOpeningBalanceDto } from './dto/inventory.dto';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryPresenter } from './presenters/inventory.presenter';
import { AccountingPostingFacade, type OpeningStockPostedIntent, type PrismaTransactionClient } from '../accounting/posting';
import { assertFiscalPeriodOpen } from '../accounting/accounts/utils/assert-period-open';

export interface MovementParams {
    tenantId: string;
    warehouseId: string;
    itemId: string;
    fiscalPeriodId: string;
    movementType: StockMovementType;
    quantity: number; // can be negative for outflows
    unitCost: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    userId: string;
}

@Injectable()
export class InventoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryRepository: InventoryRepository,
        private readonly inventoryPresenter: InventoryPresenter,
        private readonly postingFacade: AccountingPostingFacade,
    ) {}

    /**
     * Transaction-aware core posting engine. Runs inside the caller's $transaction
     * so stock + GL + entity-status changes commit atomically.
     */
    async postMovementTx(tx: PrismaTransactionClient, params: MovementParams): Promise<{ id: string }> {
        const movement = await tx.stockMovement.create({
            data: {
                tenantId: params.tenantId,
                warehouseId: params.warehouseId,
                itemId: params.itemId,
                fiscalPeriodId: params.fiscalPeriodId,
                movementType: params.movementType,
                quantity: params.quantity,
                unitCost: params.unitCost,
                referenceType: params.referenceType,
                referenceId: params.referenceId,
                notes: params.notes,
                createdBy: params.userId,
            },
        });

        const balance = await tx.stockBalance.findUnique({
            where: {
                tenantId_warehouseId_itemId: {
                    tenantId: params.tenantId,
                    warehouseId: params.warehouseId,
                    itemId: params.itemId,
                },
            },
        });

        if (!balance) {
            await tx.stockBalance.create({
                data: {
                    tenantId: params.tenantId,
                    warehouseId: params.warehouseId,
                    itemId: params.itemId,
                    quantity: params.quantity,
                    averageCost: params.unitCost,
                },
            });
        } else {
            const newQuantity = Number(balance.quantity) + params.quantity;
            let newAverageCost = Number(balance.averageCost);
            if (params.quantity > 0) {
                const totalValue = (Number(balance.quantity) * Number(balance.averageCost)) + (params.quantity * params.unitCost);
                newAverageCost = totalValue / newQuantity;
            }
            await tx.stockBalance.update({
                where: { id: balance.id },
                data: { quantity: newQuantity, averageCost: newAverageCost },
            });
        }

        return movement;
    }

    /** Standalone entry point — wraps postMovementTx in its own transaction. */
    async postMovement(params: MovementParams) {
        return this.prisma.$transaction((tx) => this.postMovementTx(tx, params));
    }

    async registerOpeningBalance(tenantId: string, userId: string, dto: PostOpeningBalanceDto) {
        const period = await this.prisma.fiscalPeriod.findFirst({
            where: { id: dto.fiscalPeriodId, tenantId },
            select: { status: true },
        });
        assertFiscalPeriodOpen(period?.status);

        const totalValue = dto.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);

        return this.prisma.$transaction(async (tx) => {
            for (const item of dto.items) {
                await this.postMovementTx(tx, {
                    tenantId,
                    userId,
                    warehouseId: dto.warehouseId,
                    itemId: item.itemId,
                    fiscalPeriodId: dto.fiscalPeriodId,
                    movementType: StockMovementType.OPENING,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    notes: 'Opening Balance Registration',
                });
            }

            let journalEntryId: string | null = null;
            if (totalValue !== 0) {
                const intent: OpeningStockPostedIntent = {
                    kind: 'OPENING_STOCK_POSTED',
                    tenantId,
                    userId,
                    date: new Date(),
                    fiscalPeriodId: dto.fiscalPeriodId,
                    fiscalPeriodStatus: period?.status,
                    exchangeRate: 1,
                    referenceId: dto.warehouseId,
                    description: 'Opening inventory balance',
                    totalValue,
                };
                const result = await this.postingFacade.record(tx, intent);
                journalEntryId = result.journalEntryId;
            }

            return { count: dto.items.length, warehouseId: dto.warehouseId, journalEntryId };
        });
    }

    async getBalances(tenantId: string, filters: { warehouseId?: string; itemId?: string }) {
        const balances = await this.inventoryRepository.getBalances(tenantId, filters);
        return this.inventoryPresenter.toResponseList(balances);
    }
}
```

- [ ] **Step 2: Update `inventory.module.ts`**

```ts
// apps/api/src/modules/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryPresenter } from './presenters/inventory.presenter';
import { WarehousesModule } from './warehouses/warehouses.module';
import { PostingModule } from '../accounting/posting';

@Module({
    imports: [WarehousesModule, PostingModule],
    controllers: [InventoryController],
    providers: [InventoryService, InventoryRepository, InventoryPresenter],
    exports: [InventoryService, WarehousesModule],
})
export class InventoryModule {}
```

- [ ] **Step 3: Update `inventory.opening.spec.ts`**

```ts
// apps/api/src/modules/inventory/inventory.opening.spec.ts
import { InventoryService } from './inventory.service';
import { AccountingPostingFacade } from '../accounting/posting';

describe('InventoryService.registerOpeningBalance', () => {
    it('posts movements and records an opening-stock intent with the summed value', async () => {
        const tx = {
            stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
            stockBalance: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
        };
        const prisma = {
            $transaction: jest.fn((cb: any) => cb(tx)),
            fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ status: 'OPEN' }) },
        } as any;
        const postingFacade = {
            record: jest.fn().mockResolvedValue({ journalEntryId: 'je-open' }),
            reverse: jest.fn(),
        } as unknown as AccountingPostingFacade;
        const svc = new InventoryService(prisma, {} as any, {} as any, postingFacade);

        const res = await svc.registerOpeningBalance('t', 'u', {
            warehouseId: 'w1', fiscalPeriodId: 'fp',
            items: [{ itemId: 'i1', quantity: 10, unitCost: 6 }, { itemId: 'i2', quantity: 20, unitCost: 3 }],
        } as any);

        expect(postingFacade.record).toHaveBeenCalledTimes(1);
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        // 10*6 + 20*3 = 120
        expect(intent.totalValue).toBe(120);
        expect(intent.kind).toBe('OPENING_STOCK_POSTED');
        expect(res).toMatchObject({ count: 2, warehouseId: 'w1', journalEntryId: 'je-open' });
    });

    it('rejects registering an opening balance in a CLOSED fiscal period', async () => {
        const prisma = {
            $transaction: jest.fn(),
            fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ status: 'CLOSED' }) },
        } as any;
        const postingFacade = { record: jest.fn(), reverse: jest.fn() } as unknown as AccountingPostingFacade;
        const svc = new InventoryService(prisma, {} as any, {} as any, postingFacade);

        await expect(svc.registerOpeningBalance('t', 'u', {
            warehouseId: 'w1', fiscalPeriodId: 'fp',
            items: [{ itemId: 'i1', quantity: 10, unitCost: 6 }],
        } as any)).rejects.toThrow(/closed/i);
    });
});
```

- [ ] **Step 4: Check `inventory.service.spec.ts` for constructor arity fallout**

That file constructs `new InventoryService({} as any, {} as any, {} as any, {} as any, {} as any, {} as any)` (six args, matching the *old* six-parameter constructor) purely to call `postMovementTx` in isolation. Update both call sites to the new four-parameter constructor:

```ts
// apps/api/src/modules/inventory/inventory.service.spec.ts — change both instantiations
const svc = new InventoryService({} as any, {} as any, {} as any, {} as any);
```

(Two occurrences, one per `it()` block — the rest of the file, including `buildTx` and `params`, is unchanged.)

- [ ] **Step 5: Run the touched specs**

```bash
pnpm --filter @devloggers/api test -- inventory.service.spec inventory.opening.spec
pnpm --filter @devloggers/api exec tsc --noEmit
```

Expected: PASS; 0 typecheck errors outside golden-master.spec.ts (fixed Task 17 — inventory's opening-stock path isn't covered by golden masters at the service level either).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/inventory/inventory.service.ts apps/api/src/modules/inventory/inventory.module.ts apps/api/src/modules/inventory/inventory.opening.spec.ts apps/api/src/modules/inventory/inventory.service.spec.ts
git commit -m "refactor(inventory): route opening-stock posting through AccountingPostingFacade (Phase 1 task 1.5.5)"
```

---

## Task 16: Migrate `opening-balances.service.ts` (spec task 1.5.6) — includes a required stop-and-confirm

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/services/opening-balances.service.ts`
- Modify: `apps/api/src/modules/accounting/accounts/accounts.module.ts`

**Interfaces:**
- Consumes: `AccountingPostingFacade`, `OpeningBalancePostedIntent`.
- Produces: `OpeningBalancesService` constructor becomes `(prisma, postingFacade)` — `journalPosting` and `financialSettings` are gone (`financialSettings.getOrThrow` moves into `OpeningBalancePolicy`, Task 8). `accounts.module.ts` stops exporting `JournalPostingService` (spec task 1.6.2) and imports `PostingModule`.

### ⚠️ Decision needed before writing code — read this first

This call site is the **one place** where routing through the facade is not purely mechanical, because `opening-balances.service.ts` currently allocates its own JE number by hand instead of calling `DocumentSequencesService.getNextNumber`:

```ts
// current code, opening-balances.service.ts:126-131
const docSequence = await this.prisma.documentSequence.findFirst({ where: { tenantId, documentType: 'JOURNAL_ENTRY' } });
const nextNumber = docSequence
    ? `${docSequence.prefix}${String(docSequence.nextNumber).padStart(docSequence.padding, '0')}`
    : `JE-${Date.now()}`;
// ...later, inside its own $transaction, manually increments docSequence
```

Compare `DocumentSequencesRepository.getNextNumber` (`apps/api/src/modules/accounting/document-sequences/repositories/document-sequences.repository.ts:22-38`), which every other of the five real call sites already uses via `AccountingPostingFacade`:

```ts
return `${seq.prefix}-${padded}`;   // note the hyphen
```

**Measured difference:** the manual code produces `JE00001` (no separator); the shared repository produces `JE-00001` (hyphenated). This is a **real, pre-existing inconsistency** between how this one call site numbers its journal entries and how the other five do — not something Phase 1 introduces, but something Phase 1's "route through the facade for uniformity" instruction (spec task 1.5.6) will surface and change, because the facade always allocates numbers via `DocumentSequencesService.getNextNumber`.

Golden masters do not cover this path (only the pure line-builder is pinned — see the golden-master.spec.ts comment above its stock-count/opening-balance/opening-stock `describe` blocks), so this change would be silent if merged without comment. Per this plan's Global Constraints ("never fix an accounting bug found along the way inside this phase — log it and stop"), **do not decide this alone**: implement the migration exactly as below (which accepts the hyphenated format, matching the other five call sites), but flag the diff explicitly in the PR description quoting this section, and get an explicit yes from whoever owns the accounting domain before merging. This is now also recorded in the Q2 log at the end of this plan.

- [ ] **Step 1: Rewrite `opening-balances.service.ts`**

```ts
// apps/api/src/modules/accounting/accounts/services/opening-balances.service.ts
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '@devloggers/db-prisma/nest'
import { AccountingPostingFacade, type OpeningBalancePostedIntent } from '../../posting'
import { assertFiscalPeriodOpen } from '../utils/assert-period-open'
import { PostAccountOpeningBalanceDto, AccountOpeningBalanceResponseDto } from '../dto/opening-balance.dto'

@Injectable()
export class OpeningBalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postingFacade: AccountingPostingFacade,
  ) {}

  async postOpeningBalances(
    tenantId: string,
    userId: string,
    dto: PostAccountOpeningBalanceDto,
  ): Promise<AccountOpeningBalanceResponseDto> {
    const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({
      where: { id: dto.fiscalPeriodId, tenantId },
    })
    if (!fiscalPeriod) {
      throw new BadRequestException('Fiscal period not found')
    }
    assertFiscalPeriodOpen(fiscalPeriod.status)

    const nonZeroEntries = dto.entries.filter((e) => e.amount !== 0)
    if (nonZeroEntries.length === 0) {
      throw new BadRequestException('At least one entry with a non-zero amount is required')
    }

    const intent: OpeningBalancePostedIntent = {
      kind: 'OPENING_BALANCE_POSTED',
      tenantId,
      userId,
      date: fiscalPeriod.startDate,
      fiscalPeriodId: fiscalPeriod.id,
      fiscalPeriodStatus: fiscalPeriod.status,
      exchangeRate: 1,
      referenceId: `opening-balance-${Date.now()}`,
      description: 'Opening balances',
      entries: nonZeroEntries.map((e) => ({ accountId: e.accountId, amount: e.amount })),
    }

    const result = await this.prisma.$transaction((tx) => this.postingFacade.record(tx, intent))

    return {
      journalEntryId: result.journalEntryId,
      entriesCount: nonZeroEntries.length,
    }
  }
}
```

Note everything that disappeared: the account-classification loop, the suspense-offset math, and the manual `documentSequence` read/increment (all now inside `OpeningBalancePolicy` + the facade's own `docSeqService.getNextNumber` call — see the decision box above for the one observable consequence of that).

- [ ] **Step 2: Update `accounts.module.ts`**

```ts
// apps/api/src/modules/accounting/accounts/accounts.module.ts
import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { FinancialSettingsModule } from '../financial-settings/financial-settings.module';
import { PostingModule } from '../posting';
import { AccountsRepository } from './repositories/accounts.repository';
import { AccountsService } from './services/accounts.service';
import { AccountPresenter } from './presenters/account.presenter';
import { AccountsController } from './controllers/accounts.controller';
import { AccountBalancesController } from './controllers/account-balances.controller';
import { OpeningBalancesController } from './controllers/opening-balances.controller';
import { AccountBalancesService } from './services/account-balances.service';
import { OpeningBalancesService } from './services/opening-balances.service';

@Module({
    imports: [FinancialSettingsModule, PostingModule],
    controllers: [AccountsController, AccountBalancesController, OpeningBalancesController],
    providers: [
        AccountsRepository,
        AccountsService,
        AccountPresenter,
        AccountBalancesService,
        OpeningBalancesService,
        LocaleResolverService,
    ],
    exports: [AccountsService],
})
export class AccountsModule {}
```

`JournalPostingService` is deleted from both `providers` and `exports` (spec task 1.6.2) — it's now provided solely by `PostingModule` (Task 10), and nothing in `AccountsModule` still injects it directly. This also resolves what would otherwise be a circular import: `AccountsModule` now depends on `PostingModule`, but `PostingModule` never depended on `AccountsModule` (Task 10 gave `PostingModule` its own `JournalPostingService` provider registration precisely so this one-way edge is possible).

- [ ] **Step 3: Typecheck + run the accounting suite**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm --filter @devloggers/api test -- accounts
```

Expected: 0 typecheck errors (confirms no circular-DI resolution failure at compile time — NestJS circular-module errors surface at runtime bootstrap, not `tsc`, so also do Step 4).

- [ ] **Step 4: Smoke-boot the app to catch a NestJS circular-dependency error, which `tsc` cannot see**

```bash
pnpm --filter @devloggers/api generate
```

Expected: exits 0 (this command bootstraps the full Nest application graph without a DB connection — see `.ai/rules/api.md` — so a circular-module wiring mistake here throws `NestCannotResolveDependencyError` / `NestModule (…): providers is not a function`-style errors at this step rather than typecheck).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/services/opening-balances.service.ts apps/api/src/modules/accounting/accounts/accounts.module.ts
git commit -m "refactor(accounting): route account opening-balance posting through AccountingPostingFacade (Phase 1 task 1.5.6)

Numbering format changes from JE00001 to JE-00001 for this one call site,
matching the other five posting paths for the first time. See Task 16's
decision note in docs/superpowers/plans/2026-07-26-phase-1-gl-posting-port.md
and the Q2 log at the end of that file."
```

---

## Task 17: Rebuild the golden-master harness to route through the facade

**Files:**
- Modify: `apps/api/src/modules/accounting/posting/__tests__/golden-master.harness.ts`
- Modify: `apps/api/src/modules/accounting/posting/__tests__/golden-master.spec.ts`

**Interfaces:**
- Consumes: `AccountingPostingFacade`, `PostingPolicyRegistry`, all 9 policies, `JournalPostingService` (all from Tasks 2-10).
- Produces: `fakePostingFacade(settingsOverrides?)` — a harness helper every fixture-builder in `golden-master.spec.ts` now uses instead of constructing `JournalPostingService` + `FinancialSettingsService` fakes by hand.

This is the task that makes the suite compile again after Tasks 11-13 changed `InvoicePostingService`/`PaymentsService`/`ExpensesService`'s constructors. **Every existing `toEqual` expectation stays byte-identical** — only the *arrange* portion of each `it()` changes, and only where the service under test now fetches something (the party override) through `tx` instead of through an `include`.

- [ ] **Step 1: Add a `party` fake and a `partyOverride` option to the harness's transaction double**

In `golden-master.harness.ts`, add `partyOverride` to `TxOptions` and a `party.findFirst` to the `tx` object inside `createCapture`:

```ts
// Add to the TxOptions interface:
export interface TxOptions {
    /** Rows returned by `stockBalance.findUnique`, keyed by itemId. */
    stockBalances?: Record<string, { quantity: number; averageCost: number }>;
    /** Rows returned by `stockMovement.findMany` (invoice cancellation replays these). */
    stockMovements?: Array<{ warehouseId: string; itemId: string; quantity: number; unitCost: number }>;
    /** The entry `journalPosting.reverse` should find and mirror. */
    originalEntry?: { id: string; lines: CapturedLine[] };
    /** Row returned by `tx.party.findFirst` inside InvoicePostedPolicy / PaymentRecordedPolicy. */
    partyOverride?: { receivableAccountId?: string | null; payableAccountId?: string | null } | null;
}
```

```ts
// Inside createCapture's `tx` object, add:
        party: {
            findFirst: async () => options.partyOverride ?? null,
        },
```

- [ ] **Step 2: Add `fakePostingFacade` — the real facade wired to fakes at its edges**

Append to `golden-master.harness.ts`, after the existing `fakeInventory` export:

```ts
import { JournalPostingService } from '../../accounts/services/journal-posting.service';
import { AccountingPostingFacade } from '../accounting-posting.facade';
import { PostingPolicyRegistry } from '../posting-policy.registry';
import { InvoicePostedPolicy } from '../policies/invoice-posted.policy';
import { InvoiceCancelledPolicy } from '../policies/invoice-cancelled.policy';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from '../policies/payment-recorded.policy';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from '../policies/expense-recorded.policy';
import { StockCountAdjustedPolicy } from '../policies/stock-count-adjusted.policy';
import { OpeningBalancePolicy } from '../policies/opening-balance.policy';
import { OpeningStockPolicy } from '../policies/opening-stock.policy';

/**
 * Builds the *real* AccountingPostingFacade — real registry, real policies,
 * real JournalPostingService — with only FinancialSettingsService and
 * DocumentSequencesService faked at the edges. This is what makes the golden
 * masters exercise the actual Phase 1 code path, not a stand-in for it.
 */
export function fakePostingFacade(settings: Partial<typeof SETTINGS> = {}): AccountingPostingFacade {
    const financialSettingsService = fakeFinancialSettings(settings);
    const registry = new PostingPolicyRegistry(
        new InvoicePostedPolicy(financialSettingsService),
        new PaymentRecordedPolicy(financialSettingsService),
        new ExpenseRecordedPolicy(),
        new StockCountAdjustedPolicy(financialSettingsService),
        new OpeningBalancePolicy(financialSettingsService),
        new OpeningStockPolicy(financialSettingsService),
        new InvoiceCancelledPolicy(),
        new PaymentCancelledPolicy(),
        new ExpenseCancelledPolicy(),
    );
    return new AccountingPostingFacade(registry, new JournalPostingService(), fakeDocSeq);
}
```

- [ ] **Step 3: Update `golden-master.spec.ts`'s imports**

Replace:

```ts
import { InvoicePostingService } from '../../../invoicing/invoices/invoice-posting.service';
import { PaymentsService } from '../../../invoicing/payments/payments.service';
import { ExpensesService } from '../../../invoicing/expenses/expenses.service';
// The real posting service, not a stub — so account validation and the
// balance assertion are exercised on every captured entry.
import { JournalPostingService } from '../../accounts/services/journal-posting.service';
import {
    buildStockCountVarianceLines,
    buildOpeningBalanceLines,
    buildCogsJournalLines,
} from '../../accounts/utils/inventory-journal';
import {
    ACC,
    JE_NUMBER,
    PARTY,
    PERIOD,
    TENANT,
    USER,
    WAREHOUSE,
    createCapture,
    expectBalanced,
    fakeDocSeq,
    fakeFinancialSettings,
    fakeInventory,
    fakePrisma,
    type CapturedEntry,
} from './golden-master.harness';
```

with:

```ts
import { InvoicePostingService } from '../../../invoicing/invoices/invoice-posting.service';
import { PaymentsService } from '../../../invoicing/payments/payments.service';
import { ExpensesService } from '../../../invoicing/expenses/expenses.service';
import {
    buildStockCountVarianceLines,
    buildOpeningBalanceLines,
    buildCogsJournalLines,
} from '../policies/legacy-line-math.spec-fixtures';
import {
    ACC,
    JE_NUMBER,
    PARTY,
    PERIOD,
    TENANT,
    USER,
    WAREHOUSE,
    createCapture,
    expectBalanced,
    fakeDocSeq,
    fakeInventory,
    fakePostingFacade,
    fakePrisma,
    type CapturedEntry,
} from './golden-master.harness';
```

The three `buildXJournalLines` imports move to a small fixtures-only re-export file, since their source files (`inventory-journal.ts`) were deleted when their logic moved into policies in Tasks 7-9 — see Step 4.

- [ ] **Step 4: Create the line-math re-export used only by paths 8-10's pure-function pinning**

Paths 8-10 (stock-count variance, opening balance, opening stock) are pinned at the line-math level per the golden master's own header comment, not end-to-end — and that math now lives as private implementation detail inside three policy classes rather than as three standalone exported functions. Re-expose just enough to keep those three `describe` blocks (lines ~609-686 of the original file) working without duplicating the math a second time:

```ts
// apps/api/src/modules/accounting/posting/policies/legacy-line-math.spec-fixtures.ts
/**
 * Thin re-exports of the pure line-building math now embedded in
 * StockCountAdjustedPolicy / OpeningBalancePolicy / OpeningStockPolicy /
 * InvoicePostedPolicy, kept importable under their pre-Phase-1 names so
 * golden-master.spec.ts's paths-8-10 pinning (which never went through a
 * live service, only the math) doesn't need to change at all. Test-only.
 */
function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

export function buildStockCountVarianceLines(input: { inventoryAccountId: string; adjustmentAccountId: string; netAmount: number }) {
    const amt = round(Math.abs(input.netAmount));
    const surplus = input.netAmount > 0;
    return [
        { accountId: input.inventoryAccountId, debit: surplus ? amt : 0, credit: surplus ? 0 : amt, description: null, sortOrder: 0 },
        { accountId: input.adjustmentAccountId, debit: surplus ? 0 : amt, credit: surplus ? amt : 0, description: null, sortOrder: 1 },
    ];
}

export function buildOpeningBalanceLines(input: { inventoryAccountId: string; openingEquityAccountId: string; amount: number }) {
    const amt = round(input.amount);
    return [
        { accountId: input.inventoryAccountId, debit: amt, credit: 0, description: null, sortOrder: 0 },
        { accountId: input.openingEquityAccountId, debit: 0, credit: amt, description: null, sortOrder: 1 },
    ];
}

export function buildCogsJournalLines(
    input: { cogsAccountId: string; inventoryAccountId: string; amount: number },
    opts: { reverse?: boolean } = {},
) {
    const rev = opts.reverse ?? false;
    const amt = round(input.amount);
    return [
        { accountId: input.cogsAccountId, debit: rev ? 0 : amt, credit: rev ? amt : 0, description: null, sortOrder: 0 },
        { accountId: input.inventoryAccountId, debit: rev ? amt : 0, credit: rev ? 0 : amt, description: null, sortOrder: 1 },
    ];
}
```

**Why a duplicate rather than exporting from the policy files:** the policies intentionally do not export their internal per-line math as standalone functions (that would re-create the exact "pure function to import from anywhere" surface the phase is trying to fence behind the facade). This file is explicitly named and scoped as a spec fixture, imported only by `golden-master.spec.ts`, never by production code — the boundary lint in Task 18 excludes `**/*.spec-fixtures.ts` for this reason.

- [ ] **Step 5: Update the three service-builder helpers**

Replace:

```ts
function buildInvoicePosting(capture: ReturnType<typeof createCapture>, invoice: Record<string, any>, settings = {}) {
    const prisma = fakePrisma(capture, {
        invoice: { ...capture.tx.invoice, findFirst: async () => invoice },
        journalEntry: { ...capture.tx.journalEntry },
    });
    return new InvoicePostingService(
        prisma,
        fakeInventory,
        fakeFinancialSettings(settings),
        fakeDocSeq,
        // JournalPostingService is stateless — use the real one so account
        // validation and the balance check are exercised, not stubbed away.
        new JournalPostingService(),
    );
}
```

with:

```ts
function buildInvoicePosting(capture: ReturnType<typeof createCapture>, invoice: Record<string, any>, settings = {}) {
    const prisma = fakePrisma(capture, {
        invoice: { ...capture.tx.invoice, findFirst: async () => invoice },
        journalEntry: { ...capture.tx.journalEntry },
    });
    return new InvoicePostingService(prisma, fakeInventory, fakePostingFacade(settings));
}
```

Replace (inside the payment `describe` block):

```ts
    function buildPayments(capture: ReturnType<typeof createCapture>, payment: Record<string, any>) {
        const prisma = fakePrisma(capture, {
            payment: { ...capture.tx.payment, findFirst: async () => payment },
            cashbox: { ...capture.tx.cashbox, findUnique: async () => ({ linkedAccountId: ACC.cashbox }) },
            journalEntry: { ...capture.tx.journalEntry, findFirst: async () => ({ id: 'je-original' }) },
        });
        return new PaymentsService(
            prisma,
            fakeDocSeq,
            fakeFinancialSettings(),
            new JournalPostingService(),
        );
    }
```

with:

```ts
    function buildPayments(capture: ReturnType<typeof createCapture>, payment: Record<string, any>) {
        const prisma = fakePrisma(capture, {
            payment: { ...capture.tx.payment, findFirst: async () => payment },
            cashbox: { ...capture.tx.cashbox, findUnique: async () => ({ linkedAccountId: ACC.cashbox }) },
            journalEntry: { ...capture.tx.journalEntry, findFirst: async () => ({ id: 'je-original' }) },
        });
        return new PaymentsService(prisma, fakeDocSeq, fakePostingFacade());
    }
```

(`fakeDocSeq` stays a direct constructor argument here — `PaymentsService` still allocates its own RECEIPT/PAYMENT document number itself, separately from the JE number the facade allocates internally.)

Replace (inside the expense `describe` block):

```ts
    function buildExpenses(capture: ReturnType<typeof createCapture>, expense: Record<string, any>) {
        const prisma = fakePrisma(capture, {
            expense: { ...capture.tx.expense, findFirst: async () => expense },
            chartOfAccount: {
                ...capture.tx.chartOfAccount,
                // assertAccountFitsSlot needs EXPENSE/ASSET types, which the shared
                // fixture flattens to ASSET — supply the per-slot types here.
                findMany: async () => [
                    { id: ACC.expenseRent, code: 'exp-rent', type: 'EXPENSE', isPostable: true, isContra: false, deletedAt: null, isActive: true },
                    { id: ACC.expenseUtilities, code: 'exp-util', type: 'EXPENSE', isPostable: true, isContra: false, deletedAt: null, isActive: true },
                    { id: ACC.cashbox, code: 'cashbox', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null, isActive: true },
                ],
            },
            journalEntry: { ...capture.tx.journalEntry, findFirst: async () => ({ id: 'je-original' }) },
        });
        return new ExpensesService(
            prisma,
            fakeDocSeq,
            new JournalPostingService(),
        );
    }
```

with:

```ts
    function buildExpenses(capture: ReturnType<typeof createCapture>, expense: Record<string, any>) {
        const prisma = fakePrisma(capture, {
            expense: { ...capture.tx.expense, findFirst: async () => expense },
            chartOfAccount: {
                ...capture.tx.chartOfAccount,
                // assertAccountFitsSlot needs EXPENSE/ASSET types, which the shared
                // fixture flattens to ASSET — supply the per-slot types here.
                findMany: async () => [
                    { id: ACC.expenseRent, code: 'exp-rent', type: 'EXPENSE', isPostable: true, isContra: false, deletedAt: null, isActive: true },
                    { id: ACC.expenseUtilities, code: 'exp-util', type: 'EXPENSE', isPostable: true, isContra: false, deletedAt: null, isActive: true },
                    { id: ACC.cashbox, code: 'cashbox', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null, isActive: true },
                ],
            },
            journalEntry: { ...capture.tx.journalEntry, findFirst: async () => ({ id: 'je-original' }) },
        });
        return new ExpensesService(prisma, fakeDocSeq, fakePostingFacade());
    }
```

- [ ] **Step 6: Fix the three party-override tests' *arrange* step (expectations untouched)**

Replace (in `describe('golden master: purchase invoice')`):

```ts
    it('party-level payable account overrides the tenant default', async () => {
        const capture = createCapture();
        const service = buildInvoicePosting(
            capture,
            invoiceFixture({ party: { payableAccountId: ACC.partyPayable } }),
        );

        await service.postPurchaseInvoice(TENANT, 'invoice-1', USER);
```

with:

```ts
    it('party-level payable account overrides the tenant default', async () => {
        const capture = createCapture({ partyOverride: { payableAccountId: ACC.partyPayable } });
        const service = buildInvoicePosting(capture, invoiceFixture());

        await service.postPurchaseInvoice(TENANT, 'invoice-1', USER);
```

Replace (in `describe('golden master: sales invoice')`):

```ts
    it('party-level receivable account overrides the tenant default', async () => {
        const capture = createCapture();
        const service = buildInvoicePosting(
            capture,
            salesInvoice({
                party: { receivableAccountId: ACC.partyReceivable },
                lines: [
                    {
                        itemId: 'item-svc', quantity: 1, unitPrice: 1000,
                        total: 1000, taxAmount: 0, item: { itemType: 'service' },
                    },
                ],
            }),
        );

        await service.postSalesInvoice(TENANT, 'invoice-1', USER);

        expect(capture.only().lines[0]!.accountId).toBe(ACC.partyReceivable);
    });
```

with:

```ts
    it('party-level receivable account overrides the tenant default', async () => {
        const capture = createCapture({ partyOverride: { receivableAccountId: ACC.partyReceivable } });
        const service = buildInvoicePosting(
            capture,
            salesInvoice({
                lines: [
                    {
                        itemId: 'item-svc', quantity: 1, unitPrice: 1000,
                        total: 1000, taxAmount: 0, item: { itemType: 'service' },
                    },
                ],
            }),
        );

        await service.postSalesInvoice(TENANT, 'invoice-1', USER);

        expect(capture.only().lines[0]!.accountId).toBe(ACC.partyReceivable);
    });
```

Replace (in `describe('golden master: payment')`):

```ts
    it('party-level receivable account overrides the tenant default', async () => {
        const capture = createCapture();
        await buildPayments(
            capture,
            paymentFixture({ party: { receivableAccountId: ACC.partyReceivable } }),
        ).post(TENANT, 'payment-1', USER);

        expect(capture.only().lines[1]!.accountId).toBe(ACC.partyReceivable);
    });
```

with:

```ts
    it('party-level receivable account overrides the tenant default', async () => {
        const capture = createCapture({ partyOverride: { receivableAccountId: ACC.partyReceivable } });
        await buildPayments(capture, paymentFixture()).post(TENANT, 'payment-1', USER);

        expect(capture.only().lines[1]!.accountId).toBe(ACC.partyReceivable);
    });
```

- [ ] **Step 7: Fix the three cancellation blocks' direct `new XService(...)` calls**

Replace (invoice cancellation):

```ts
        const service = new InvoicePostingService(
            prisma,
            fakeInventory,
            fakeFinancialSettings(),
            fakeDocSeq,
            new JournalPostingService(),
        );
```

with:

```ts
        const service = new InvoicePostingService(prisma, fakeInventory, fakePostingFacade());
```

Replace (payment cancellation):

```ts
        const service = new PaymentsService(
            prisma,
            fakeDocSeq,
            fakeFinancialSettings(),
            new JournalPostingService(),
        );
```

with:

```ts
        const service = new PaymentsService(prisma, fakeDocSeq, fakePostingFacade());
```

Replace (expense cancellation):

```ts
        const service = new ExpensesService(
            prisma,
            fakeDocSeq,
            new JournalPostingService(),
        );
```

with:

```ts
        const service = new ExpensesService(prisma, fakeDocSeq, fakePostingFacade());
```

- [ ] **Step 8: Run the golden masters — every expectation must pass unchanged**

```bash
pnpm --filter @devloggers/api test -- golden-master.spec
```

Expected: **PASS, 25/25**, with zero diffs against the committed expectations. If anything fails here, stop — per this plan's Global Constraints, a golden-master failure means the refactor changed ledger output, and the fix is to find what broke the equivalence (most likely a missed `tx.party.findFirst` wiring), never to edit the expectation.

- [ ] **Step 9: Full suite + typecheck**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm --filter @devloggers/api test
```

Expected: 0 typecheck errors; every suite in the repo passes.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/accounting/posting/__tests__/golden-master.harness.ts apps/api/src/modules/accounting/posting/__tests__/golden-master.spec.ts apps/api/src/modules/accounting/posting/policies/legacy-line-math.spec-fixtures.ts
git commit -m "test(accounting): route golden masters through the real AccountingPostingFacade (Phase 1 task 1.5, harness update)"
```

---

## Task 18: Lock the boundary — ESLint `no-restricted-imports` (spec task 1.6.1)

**Files:**
- Modify: `apps/api/eslint.config.mjs`

**Interfaces:**
- Produces: a lint rule that fails any non-accounting file importing from `modules/accounting/**` except `modules/accounting/posting` (and `modules/accounting/posting/**`).

Imports in this codebase are relative (`'../../accounting/document-sequences/...'`), not aliased, so the glob must match on the `accounting/*` suffix rather than a `modules/accounting/*` prefix — confirmed against every import rewritten in Tasks 11-16.

- [ ] **Step 1: Add the rule as a new scoped config object**

Append a new object to the `tseslint.config(...)` array in `apps/api/eslint.config.mjs`, after the existing `files: ['**/*.spec.ts', ...]` object:

```js
  {
    // Phase 1 boundary (F1): only modules/accounting/posting may be imported
    // from outside accounting. Everything else inside accounting/** is an
    // implementation detail of the GL — see
    // docs/superpowers/specs/2026-07-25-architecture-refactor/phase-1-gl-posting-port.md.
    files: ['src/modules/**/*.ts'],
    ignores: ['src/modules/accounting/**', '**/*.spec.ts', '**/*.spec-fixtures.ts', '**/__tests__/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [
            '**/accounting/*',
            '**/accounting/*/**',
            '!**/accounting/posting',
            '!**/accounting/posting/**',
          ],
          message:
            'Import GL/accounting internals only via the accounting/posting barrel ' +
            '(AccountingPostingFacade + PostingIntent types). Everything else under ' +
            'modules/accounting/** is accounting-internal as of Phase 1.',
        }],
      }],
    },
  },
```

- [ ] **Step 2: Confirm the current state is clean — every non-accounting importer was already migrated in Tasks 11-16**

```bash
grep -rn "accounting/accounts\|accounting/document-sequences\|accounting/financial-settings" apps/api/src/modules --include=*.ts | grep -v "modules/accounting/"
```

Expected: no output (every remaining import of accounting internals from outside accounting was removed in Tasks 11-16; anything left here means a call site was missed and must be fixed before this rule can go in at `error`, not `warn`).

- [ ] **Step 3: Run lint to confirm the gate is clean**

```bash
pnpm --filter @devloggers/api lint:ci
```

Expected: 0 errors from the new rule.

- [ ] **Step 4: Prove the gate fails — a guardrail unverified is not a guardrail** (same discipline as Phase 0.4 task 9)

Temporarily add a forbidden import to a non-accounting file, e.g. append to the bottom of `apps/api/src/modules/invoicing/payments/payments.service.ts`:

```ts
import { JournalPostingService as ProbeImport } from '../../accounting/accounts/services/journal-posting.service';
```

```bash
pnpm --filter @devloggers/api lint:ci
```

Expected: FAIL with the `no-restricted-imports` message from Step 1.

Then revert:

```bash
git checkout -- apps/api/src/modules/invoicing/payments/payments.service.ts
```

```bash
git diff --stat
```

Expected: no output for that file (confirms the probe left no residue).

- [ ] **Step 5: Commit**

```bash
git add apps/api/eslint.config.mjs
git commit -m "chore(api): add ESLint boundary rule for modules/accounting/** (Phase 1 task 1.6.1)"
```

---

## Task 19: Final verification, balance-drift check, and close out Q1/Q2 (spec tasks 1.6.3, 1.6.4)

**Files:** none created or modified — this task is verification + documentation only.

- [ ] **Step 1: Full repo verification**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm --filter @devloggers/api test
pnpm turbo run build --filter=@devloggers/api
pnpm turbo run lint
```

Expected: 0 typecheck errors; every test suite passes (golden masters unchanged, all 7 policy specs, registry spec, facade spec, all 6 migrated service specs); build succeeds; lint passes including the new boundary rule.

- [ ] **Step 2: Confirm the boundary is actually closed**

```bash
grep -rn "JournalPostingService\|FinancialSettingsService\|assertFiscalPeriodOpen" apps/api/src/modules --include=*.ts | grep -v "modules/accounting/"
```

Expected: **no output**. This is the spec's own "Done when" check (phase-1-gl-posting-port.md, final section) — if anything prints here, a call site was missed in Tasks 11-16.

- [ ] **Step 3: Run the balance-drift checker against a real database and compare to the Phase 0.2.4 baseline**

Requires Phase 0.2.4's baseline to already exist (`docs/drift-baseline.json`, per `phase-0-guardrails.md`). If it doesn't exist yet, this step blocks on recording it first — that is a Phase 0 gap, not a Phase 1 one; do not skip it silently.

```bash
pnpm --filter @devloggers/api dev
curl -H "Authorization: Bearer <token>" http://localhost:4040/accounting/reconciliation/balance-drift | tee docs/drift-baseline-post-phase-1.json
diff docs/drift-baseline.json docs/drift-baseline-post-phase-1.json
```

Expected: no new drift beyond the Phase 0 baseline. Any new drift is a Phase 1 regression and blocks merge (spec task 1.6.3).

- [ ] **Step 4: Manual smoke test** (spec's own checklist, `apps/api` running against a real tenant)

- [ ] Post a purchase invoice → JE lines match pre-refactor values
- [ ] Post a sales invoice with stock lines → revenue + COGS legs both present
- [ ] Cancel a posted invoice → reversal JE mirrors the original
- [ ] Record and cancel a payment → both JEs correct
- [ ] Record and cancel an expense
- [ ] Post a stock count with variance → variance JE correct
- [ ] Record an opening balance → suspense routing intact (note the numbering-format change from Task 16 in whatever you record here)
- [ ] Balance-drift report shows no new drift vs. baseline

- [ ] **Step 5: Self-review against the plan's own claims**

Re-read this plan's "Deviations from the phase spec" section and confirm all three still hold after implementation: facade step order, the three-not-six cancellation kinds, and policies-before-facade task ordering. Re-read the "Q2 log" below and confirm both entries are still accurate (not stale) — if either bug was fixed differently than documented, update the log to match reality before merging.

- [ ] **Step 6: Commit the plan's final state** (no code changes — this just closes the loop if any log entries were updated in Step 5)

```bash
git add docs/superpowers/plans/2026-07-26-phase-1-gl-posting-port.md
git commit -m "docs: close out Phase 1 GL posting port — Q1/Q2 answered, verification complete"
```

---

## Q1 — answered

*"Does `ReferenceType` need a stock-specific `OPENING_STOCK` member?"* — **No, not in Phase 1.** See Task 9. Both `OPENING_BALANCE_POSTED` and `OPENING_STOCK_POSTED` intents map to the existing `ReferenceType.OPENING_BALANCE`, matching pre-Phase-1 behaviour on disk exactly. Logged below as a real, pre-existing (not introduced) modeling gap for a future phase.

## Q2 log — accounting behaviour the policies surfaced, deliberately not fixed here

Per this plan's Global Constraints, neither of these is fixed inside Phase 1. Both are logged with concrete evidence so a follow-up spec can decide.

1. **`ChartOfAccount` opening balances and inventory opening balances share one `ReferenceType.OPENING_BALANCE` value.** A report that groups GL entries by reference type cannot distinguish "someone set up account X's starting balance" from "someone registered warehouse Y's starting stock value" — both look identical. Pre-existing (both call sites already shared this value before Phase 1; see Task 9's Q1 answer). Worth a schema migration adding a distinct enum member in a dedicated spec, not as a Phase 1 side effect.

2. **`opening-balances.service.ts`'s JE numbering format changes from `JE00001` to `JE-00001`** once routed through the shared `AccountingPostingFacade` (Task 16), because the facade always allocates numbers via `DocumentSequencesRepository.getNextNumber`, which hyphenates, while this one call site previously incremented `documentSequence` by hand without a separator. The other five posting paths already used the hyphenated format before Phase 1 — this call site was the outlier. Not covered by any golden master (opening-balance is pinned at the pure line-math level only), so this change is silent unless someone reads this log or the decision box in Task 16. Get accounting-domain sign-off before merging Task 16; if the format must stay `JE00001` for backward compatibility (e.g., external reports parse it), that requires either a `DocumentSequence`-level format field (future spec) or keeping this one call site's manual numbering — a design change to the facade contract, out of scope here.

---

## Done when

- [ ] Golden-master snapshots identical to their Phase 0 commit (Task 17, Step 8)
- [ ] `grep -rn "JournalPostingService\|FinancialSettingsService\|assertFiscalPeriodOpen" apps/api/src/modules --include=*.ts | grep -v "modules/accounting/"` returns nothing (Task 19, Step 2)
- [ ] Boundary lint rule active and passing, proven to fail on a probe import (Task 18)
- [ ] Q1 answered (Task 9); Q2 log recorded (this section) and reviewed for staleness (Task 19, Step 5)
- [ ] Balance-drift report shows no new drift vs. the Phase 0.2.4 baseline (Task 19, Step 3)

