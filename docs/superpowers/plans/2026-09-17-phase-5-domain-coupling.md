# Phase 5 — Domain Coupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Source spec:** [phase-05-domain-coupling.md](../specs/2026-08-20-erp-roadmap/phase-05-domain-coupling.md)

**Goal:** Route every stock movement through a typed `InventoryMovementFacade` (mirroring the Phase 1 posting port), lint-enforce one public entry point per API domain, and make "financial documents are cancelled or reversed, never deleted" a tested, lint-enforced policy — including closing a real `ON DELETE SET NULL` hole that currently lets master-data deletes silently detach posted ledger rows.

**Architecture:** `inventory/movements/` gets the same shape as `accounting/posting/`: `contracts/` (discriminated `MovementIntent` union) → `policies/` (one per intent kind, turns an intent into movement-line drafts, reading stock state from the caller's transaction) → `MovementPolicyRegistry` (exhaustive `assertNever` dispatch) → `InventoryMovementFacade.apply(tx, intent)` (persists each draft via `StockMovementWriter` *before* pulling the next, so per-line balance reads stay interleaved exactly as today). Domain boundaries move from one hand-written accounting block in `eslint.config.mjs` to a generated per-domain table in `apps/api/eslint/domain-boundaries.mjs`, proven by a script that lints probe imports through the real ESLint config. Deletion policy is enforced in three layers: service status guards (400), a `StatusGuardedCrudRepository` backstop (409), and a `no-restricted-syntax` lint rule against raw Prisma deletes on financial models.

**Tech Stack:** NestJS 11, Prisma (interactive transactions), Jest + ts-jest + supertest, ESLint 9 flat config + typescript-eslint (type-aware), Node 20 ESM scripts.

---

## Deviations from the spec's literal wording (each evidence-based — see Task 0)

1. **§5.1.4 "Remove remaining `tx as any` at movement call sites"** — already done. Phase 1 removed every `tx as any` from `apps/api/src/**`; the only survivors are in `inventory.service.spec.ts` (a test double, deleted in Task 5). This plan reinterprets 5.1.4 as removing the two remaining `as any` casts on the stock-count movement path (`(stockCount as any).fiscalPeriod?.status`, Task 5).
2. **§5.2.1 "one public barrel per domain"** — true for every domain *except* `accounting`, which keeps the five published entry points Phase 1 already lint-exempted (`posting`, `document-sequences`, `financial-settings`, `fiscal-periods`, `accounts/utils`). Collapsing them into one `accounting/index.ts` would re-export Nest modules that `identity/onboarding` imports individually, risking module-evaluation cycles; that consolidation belongs with Phase 6 (onboarding orchestration). `identity` publishes `auth/guards` + `auth/decorators` as a shared kernel used by every controller.
3. **§5.3.3 "Extend `StatusGuardedCrudService` guards to all Tier B documents"** — not done by re-parenting. Phase 1.5 only migrated `PaymentsService`; `ExpensesService`, `InvoicesService` and `StockCountsService` are hand-written. Each *already* has an equivalent DRAFT-only delete guard (or no delete path at all). Re-parenting them would rewrite create/update flows unrelated to deletion. Instead Task 8 **pins** every existing guard with tests, and Tasks 9–10 add the backstops the spec actually asks for.
4. **§5.3.5 "extend soft delete where needed"** — no new `deletedAt` columns. Task 0 found the *actual* hazard is four `ON DELETE SET NULL` foreign keys on ledger rows, and every affected model already has `isActive`. The fix (Task 11) is a service guard that refuses the delete and tells the user to deactivate. Flipping those FKs to `RESTRICT` needs a migration — recorded as follow-up debt, not done here (shared-DB migrations are currently deferred).
5. **§5.4.1** — `invoices.service.ts` is 401 LOC. Only one seam is extracted: the create/update line-pricing block, which is duplicated verbatim. The invoice↔payment orchestration (`recordInvoicePayment` / `addPayment`) is a second possible seam but is not split: it is small and cohesive and has one caller pair. **§5.4.2** — `payments.service.ts` (242 LOC) and `items-import.service.ts` (299 LOC) are below threshold with no duplicated responsibility: no split.

## Global Constraints

- **Behavior-preserving for GL and stock output.** Every stock movement row (warehouse, item, type, quantity, unitCost, referenceType, referenceId, notes), every balance quantity/averageCost, and every intent sent to `AccountingPostingFacade` must be identical before and after Tasks 2–5. Task 1's characterization suite is the gate: **only its `build*` helper functions may change; its assertions must not.**
- **`StockMovement.referenceType` strings are data, not labels:** `'invoice'`, `'invoice_cancellation'`, `'stock_count'` must be preserved exactly — invoice cancellation finds original movements by `referenceType: 'invoice'`.
- **No new dependencies.** `supertest`, `@nestjs/testing`, `eslint` are already installed in `apps/api`.
- **No migrations** in this phase.
- **No `eslint-disable` under `apps/api/src/modules/**`** (CI gate `scripts/check-eslint-disable.mjs`). Exemptions live in `eslint.config.mjs` `files`/`ignores`, never inline.
- **Production code:** no new `as any` / `as never` / `as unknown as`. **Test doubles** follow the existing spec convention (`{} as any` for unused constructor deps); the single `as unknown as PrismaTransactionClient` lives in the fake-tx helper.
- **`apps/api` lint:ci warning cap is 400**; baseline measured 2026-09-17 is **0 errors, 262 warnings**. No task may add an error; keep new warnings to spec files.
- **Test baseline** measured 2026-09-17: `pnpm --filter @devloggers/api test` → **19 suites, 85 tests, all passing**. `packages/backend-core` → **1 suite, 6 tests**.
- **`@devloggers/backend-core` is consumed from `dist/`** (`main: ./dist/index.js`). After changing it, run `pnpm --filter @devloggers/backend-core build` before typechecking or testing `apps/api`.
- **No API DTO/route changes** in this phase → no `pnpm generate` needed. If `git diff apps/api/openapi.yaml` is non-empty after any task, stop and investigate. (Note: `openapi.yaml` and `packages/api-contracts/types/index.ts` already had uncommitted local changes when this plan was written — do not stage them as part of any task.)
- **Commits:** one per task, conventional-commit style, ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## Task 0 — Investigation summary (read before executing; no code changes)

Evidence the plan relies on, so a reviewer can check claims instead of trusting them.

**Movement call sites (verified by grep of `postMovementTx|stockBalance\.|stockMovement\.` in `apps/api/src`):**

| Site | What it does today |
|---|---|
| `invoicing/invoices/invoice-posting.service.ts:67` | purchase: one `PURCHASE` movement per stock line, `unitCost = (total − tax) / qty × rate` |
| `invoice-posting.service.ts:121-144` | sale: **reads `tx.stockBalance` directly** (the real coupling), rejects if `available < requested`, values at `averageCost`, accumulates `cogsTotal`, posts `SALE` movement — check and write interleaved per line |
| `invoice-posting.service.ts:218-235` | cancel: **reads `tx.stockMovement.findMany` directly**, posts negating `ADJUSTMENT` at recorded cost, `referenceType 'invoice_cancellation'` |
| `inventory/stock-counts/stock-counts.service.ts:103-124` | variance: reads balance, values at `averageCost` (0 if none), accumulates `netVariance`, posts `STOCK_COUNT` |
| `inventory/inventory.service.ts:108-120` | opening stock: `OPENING` movements, notes `'Opening Balance Registration'` |
| `catalog/items/services/items.service.ts:105` | calls `InventoryService.registerOpeningStockTx` (cross-domain) |

`InventoryService.postMovement` (standalone wrapper) has **no callers**.

**Interleaving matters.** In `postSalesInvoice`, if an invoice has the same item on two lines, the second line's availability check sees the balance *after* the first line's movement. A facade that read all balances first and then wrote would change behavior. Hence the generator-based policy design (Task 3) and the duplicate-line characterization test (Task 1).

**Real cross-domain import graph** (resolved paths, non-spec files, via a scratch script — not a regex guess):

| From → to | Files | Status after this plan |
|---|---|---|
| every domain → `identity/auth/guards`, `identity/auth/decorators` | 44 | allowed (shared kernel) |
| `invoicing`, `inventory`, `identity` → accounting published entry points | 21 | allowed (Phase 1 exemptions, unchanged) |
| `invoicing` → `inventory/inventory.service`, `inventory/inventory.module` | 2 | → `modules/inventory` barrel (Task 4/5) |
| `catalog` → `inventory/inventory.service`, `inventory/inventory.module` | 2 | → barrel (Task 5) |
| `catalog` → `custom-fields/{custom-fields.module, services/…, repositories/…}` | 5 | → `modules/custom-fields` barrel (Task 7) |
| `reports` → `invoicing/invoices/presenters/invoice.presenter` | 1 | → `modules/invoicing` barrel (Task 7) |

A second scratch check confirmed **no import specifier names another domain as a path segment while resolving elsewhere**, so string globs have no false positives today.

**Deletion paths (verified):**

| Model | HTTP delete route | Guard today |
|---|---|---|
| `Payment` | `DELETE /payments/:id` **and** bulk `DELETE /payments` (factory `createCrudController`) | `StatusGuardedCrudService.beforeDelete` → 400 unless DRAFT; bulk goes through `delete()` per id. **Untested at HTTP level.** |
| `Expense` | `DELETE /expenses/:id` | `ExpensesService.remove` DRAFT-only. **Untested.** |
| `Invoice` | **none** (`InvoicesService.delete` exists, unexposed) | DRAFT-only. **Untested.** |
| `JournalEntry` | none (GET only) | — |
| `StockCount` | none | — |
| `OpeningBalanceSession` | `DELETE /opening-balance-sessions/:id` | `assertMutable` DRAFT-only |
| `ChartOfAccount` | factory route | `AccountsService.delete` → archive (`deletedAt`), refused if journal lines exist — the only soft delete |

Raw Prisma deletes on financial models: `invoices.service.ts:398`, `expenses.service.ts:103`, `opening-balance-sessions.service.ts:112` (all guarded), `data-reset.service.ts` (tenant-wide danger zone, phrase-confirmed). Only `PaymentsRepository` extends `CrudRepository` among financial documents.

**The hole (F8, verified in migration SQL):** these foreign keys are `ON DELETE SET NULL`:
`payments.party_id` (`20260401191719_full_app`), `journal_lines.party_id` (`20260617190949_update_accounting`), `journal_lines.cashbox_id`, `journal_lines.bank_account_id`, `journal_lines.currency_id` (`20260821000000_subledger_foundation` and earlier). `PartiesService`, `CashboxesService`, `BankAccountsService`, `CurrenciesService` have **no `beforeDelete`**. So `DELETE /parties/:id` on a party with posted payments but no invoices succeeds and Postgres strips `party_id` from its payments and journal lines — the AR/AP subledger loses the party dimension permanently. All four models have `isActive`.

**Tooling facts:** CI already runs `pnpm --filter @devloggers/api lint:ci` (errors fail the build) but nothing proves the boundary rule fires. ESLint is 9.39.4. `tsconfig.build.json` excludes only `**/*spec.ts`, so shared test helpers under `__tests__/` need an explicit build exclude. `backend-core` tests are **not** run in CI today.

---

## Part A — Inventory movement port (spec §5.1)

### Task 1: Characterization suite — pin today's stock-movement output

This is **not** red→green TDD. It pins current behavior through the public services *before* anything moves, so Tasks 2–5 refactor against a safety net. Every test must pass on the current code.

**Files:**
- Create: `apps/api/src/modules/inventory/movements/__tests__/fake-inventory-tx.ts`
- Create: `apps/api/src/modules/inventory/movements/__tests__/movement-characterization.spec.ts`
- Modify: `apps/api/tsconfig.build.json`

**Interfaces:**
- Produces: `createFakeInventoryTx(seed?)` → `{ tx, client: PrismaTransactionClient, state: { balances, movements, itemUpdates } }`; `movementRows(movements)` and `balanceRows(balances)` projections. Tasks 2, 3 and 5 reuse them.

- [ ] **Step 1: Exclude shared test helpers from the Nest build**

Replace `apps/api/tsconfig.build.json` with:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "**/__tests__/**"]
}
```

- [ ] **Step 2: Write the stateful fake transaction**

```ts
// apps/api/src/modules/inventory/movements/__tests__/fake-inventory-tx.ts
import type { PrismaTransactionClient } from '../../../accounting/posting';

export interface FakeBalance {
    id: string;
    tenantId: string;
    warehouseId: string;
    itemId: string;
    quantity: number;
    averageCost: number;
}

export interface FakeMovement {
    id: string;
    tenantId: string;
    warehouseId: string;
    itemId: string;
    fiscalPeriodId: string;
    movementType: string;
    quantity: number;
    unitCost: number;
    referenceType?: string | null;
    referenceId?: string | null;
    notes?: string | null;
    createdBy: string;
}

interface BalanceKey {
    tenantId: string;
    warehouseId: string;
    itemId: string;
}

/**
 * In-memory stand-in for the slice of Prisma.TransactionClient that stock
 * posting touches. Stateful on purpose: a balance written by one movement is
 * visible to the next read, which is what the interleaving tests depend on.
 * Reads return copies so callers cannot mutate stored state by accident.
 */
export function createFakeInventoryTx(
    seed: { balances?: Omit<FakeBalance, 'id'>[]; movements?: Omit<FakeMovement, 'id'>[] } = {},
) {
    let seq = 0;
    const nextId = (prefix: string) => `${prefix}-${++seq}`;
    const balances: FakeBalance[] = (seed.balances ?? []).map((b) => ({ ...b, id: nextId('bal') }));
    const movements: FakeMovement[] = (seed.movements ?? []).map((m) => ({ ...m, id: nextId('seed-mv') }));
    const itemUpdates: { id: string; data: Record<string, unknown> }[] = [];

    const findBalance = (key: BalanceKey) =>
        balances.find((b) => b.tenantId === key.tenantId && b.warehouseId === key.warehouseId && b.itemId === key.itemId) ?? null;

    const tx = {
        stockMovement: {
            create: jest.fn(async ({ data }: { data: Omit<FakeMovement, 'id'> }) => {
                const row = { ...data, id: nextId('mv') };
                movements.push(row);
                return row;
            }),
            findMany: jest.fn(async ({ where }: { where: { tenantId: string; referenceType: string; referenceId: string } }) =>
                movements
                    .filter((m) => m.tenantId === where.tenantId && m.referenceType === where.referenceType && m.referenceId === where.referenceId)
                    .map((m) => ({ ...m })),
            ),
        },
        stockBalance: {
            findUnique: jest.fn(async ({ where }: { where: { tenantId_warehouseId_itemId: BalanceKey } }) => {
                const found = findBalance(where.tenantId_warehouseId_itemId);
                return found ? { ...found } : null;
            }),
            create: jest.fn(async ({ data }: { data: Omit<FakeBalance, 'id'> }) => {
                const row = { ...data, id: nextId('bal') };
                balances.push(row);
                return { ...row };
            }),
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: { quantity: number; averageCost: number } }) => {
                const row = balances.find((b) => b.id === where.id);
                if (!row) throw new Error(`fake tx: no balance with id ${where.id}`);
                Object.assign(row, data);
                return { ...row };
            }),
        },
        item: {
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
                itemUpdates.push({ id: where.id, data });
                return { id: where.id };
            }),
        },
        invoice: {
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data })),
        },
        stockCount: {
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data, lines: [] })),
        },
    };

    return {
        tx,
        // The one deliberate cast: this fake implements only the delegates stock posting uses.
        client: tx as unknown as PrismaTransactionClient,
        state: { balances, movements, itemUpdates },
    };
}

/** The persisted fields that define a movement's accounting meaning (ids and createdBy excluded). */
export function movementRows(movements: FakeMovement[]) {
    return movements.map(({ warehouseId, itemId, movementType, quantity, unitCost, referenceType, referenceId, notes }) => ({
        warehouseId, itemId, movementType, quantity, unitCost, referenceType, referenceId, notes,
    }));
}

export function balanceRows(balances: FakeBalance[]) {
    return balances.map(({ warehouseId, itemId, quantity, averageCost }) => ({ warehouseId, itemId, quantity, averageCost }));
}
```

- [ ] **Step 3: Write the characterization suite**

The `build*` helpers are the **only** code later tasks may edit in this file.

```ts
// apps/api/src/modules/inventory/movements/__tests__/movement-characterization.spec.ts
import { InvoicePostingService } from '../../../invoicing/invoices/invoice-posting.service';
import { StockCountsService } from '../../stock-counts/stock-counts.service';
import { InventoryService } from '../../inventory.service';
import { createFakeInventoryTx, movementRows, balanceRows } from './fake-inventory-tx';

/**
 * Phase 5 golden master for stock output. Pins the movement rows, balances and
 * GL intents produced by today's services. Tasks 2–5 may only change the
 * build* helpers below — never an assertion.
 */

type FakeTx = ReturnType<typeof createFakeInventoryTx>;

function postingFacadeMock() {
    return {
        record: jest.fn().mockResolvedValue({ journalEntryId: 'je' }),
        reverse: jest.fn().mockResolvedValue({ journalEntryId: 'je-r' }),
    };
}

function buildInventoryService(postingFacade: ReturnType<typeof postingFacadeMock>) {
    return new InventoryService({} as any, {} as any, {} as any, postingFacade as any);
}

function buildInvoicePosting(fake: FakeTx, invoice: Record<string, unknown>) {
    const postingFacade = postingFacadeMock();
    const prisma = {
        invoice: { findFirst: jest.fn().mockResolvedValue(invoice) },
        journalEntry: { findFirst: jest.fn().mockResolvedValue({ id: 'je-1' }) },
        $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(fake.client)),
    };
    const svc = new InvoicePostingService(prisma as any, buildInventoryService(postingFacade), postingFacade as any);
    return { svc, postingFacade };
}

function buildStockCounts(fake: FakeTx, stockCount: Record<string, unknown>, itemTypes: { id: string; itemType: string }[]) {
    const postingFacade = postingFacadeMock();
    const prisma = {
        item: { findMany: jest.fn().mockResolvedValue(itemTypes) },
        $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(fake.client)),
    };
    const repo = { findById: jest.fn().mockResolvedValue(stockCount) };
    const presenter = { toDetailResponse: jest.fn((x: unknown) => x) };
    const emitter = { emit: jest.fn() };
    const svc = new StockCountsService(
        prisma as any, buildInventoryService(postingFacade), {} as any, repo as any, presenter as any, emitter as any, postingFacade as any,
    );
    return { svc, postingFacade };
}

const T = 't1';
const W = 'w1';

function invoiceFixture(overrides: Record<string, unknown>) {
    return {
        id: 'inv-1', status: 'DRAFT', warehouseId: W, fiscalPeriodId: 'fp-1', date: new Date('2026-01-15'), number: 'INV-1',
        exchangeRate: 1, subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0, partyId: 'p1', currencyId: 'c1',
        paymentAllocations: [], fiscalPeriod: { status: 'OPEN' },
        ...overrides,
    };
}

describe('Stock movement characterization (Phase 5 golden master)', () => {
    it('purchase: one PURCHASE movement per stock line at net base-currency cost; services skipped', async () => {
        const fake = createFakeInventoryTx({ balances: [{ tenantId: T, warehouseId: W, itemId: 'i1', quantity: 10, averageCost: 4 }] });
        const { svc, postingFacade } = buildInvoicePosting(fake, invoiceFixture({
            exchangeRate: 2, subtotal: 160, taxAmount: 10, total: 170,
            invoiceType: { direction: 'PURCHASE', affectsStock: true },
            lines: [
                { itemId: 'i1', quantity: 2, unitPrice: 55, total: 110, taxAmount: 10, item: { itemType: 'product' } },
                { itemId: 's1', quantity: 1, unitPrice: 50, total: 50, taxAmount: 0, item: { itemType: 'service' } },
            ],
        }));

        await svc.postPurchaseInvoice(T, 'inv-1', 'u1');

        expect(movementRows(fake.state.movements)).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'PURCHASE', quantity: 2, unitCost: 100, referenceType: 'invoice', referenceId: 'inv-1', notes: undefined },
        ]);
        // (10 × 4 + 2 × 100) / 12 = 20
        expect(balanceRows(fake.state.balances)).toEqual([{ warehouseId: W, itemId: 'i1', quantity: 12, averageCost: 20 }]);
        expect(fake.state.itemUpdates).toEqual([{ id: 'i1', data: { latestPurchasePrice: 55 } }]);
        const [, intent] = postingFacade.record.mock.calls[0];
        expect(intent).toEqual(expect.objectContaining({ kind: 'INVOICE_POSTED', direction: 'PURCHASE', inventoryAmount: 100 }));
    });

    it('sale: SALE movements at averageCost, cogsTotal is their sum, averageCost unchanged on outflow', async () => {
        const fake = createFakeInventoryTx({ balances: [
            { tenantId: T, warehouseId: W, itemId: 'i1', quantity: 10, averageCost: 4 },
            { tenantId: T, warehouseId: W, itemId: 'i2', quantity: 5, averageCost: 3 },
        ] });
        const { svc, postingFacade } = buildInvoicePosting(fake, invoiceFixture({
            subtotal: 47, total: 47,
            invoiceType: { direction: 'SALE', affectsStock: true },
            lines: [
                { itemId: 'i1', quantity: 3, unitPrice: 9, total: 27, taxAmount: 0, item: { itemType: 'product' } },
                { itemId: 'i2', quantity: 1, unitPrice: 10, total: 10, taxAmount: 0, item: { itemType: 'product' } },
                { itemId: 's1', quantity: 1, unitPrice: 10, total: 10, taxAmount: 0, item: { itemType: 'service' } },
            ],
        }));

        await svc.postSalesInvoice(T, 'inv-1', 'u1');

        expect(movementRows(fake.state.movements)).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'SALE', quantity: -3, unitCost: 4, referenceType: 'invoice', referenceId: 'inv-1', notes: undefined },
            { warehouseId: W, itemId: 'i2', movementType: 'SALE', quantity: -1, unitCost: 3, referenceType: 'invoice', referenceId: 'inv-1', notes: undefined },
        ]);
        expect(balanceRows(fake.state.balances)).toEqual([
            { warehouseId: W, itemId: 'i1', quantity: 7, averageCost: 4 },
            { warehouseId: W, itemId: 'i2', quantity: 4, averageCost: 3 },
        ]);
        const [, intent] = postingFacade.record.mock.calls[0];
        expect(intent.cogsTotal).toBe(15);
    });

    it('sale: availability is re-checked per line after earlier lines have moved stock', async () => {
        const fake = createFakeInventoryTx({ balances: [{ tenantId: T, warehouseId: W, itemId: 'i1', quantity: 3, averageCost: 4 }] });
        const { svc, postingFacade } = buildInvoicePosting(fake, invoiceFixture({
            invoiceType: { direction: 'SALE', affectsStock: true },
            lines: [
                { itemId: 'i1', quantity: 2, unitPrice: 9, total: 18, taxAmount: 0, item: { itemType: 'product' } },
                { itemId: 'i1', quantity: 2, unitPrice: 9, total: 18, taxAmount: 0, item: { itemType: 'product' } },
            ],
        }));

        await expect(svc.postSalesInvoice(T, 'inv-1', 'u1')).rejects.toThrow('Insufficient stock for item "i1". Available: 1, Requested: 2');
        expect(fake.state.movements).toHaveLength(1);
        expect(postingFacade.record).not.toHaveBeenCalled();
    });

    it('cancel: negates only this invoice\'s original movements at their recorded cost', async () => {
        const fake = createFakeInventoryTx({
            balances: [{ tenantId: T, warehouseId: W, itemId: 'i1', quantity: 12, averageCost: 20 }],
            movements: [
                { tenantId: T, warehouseId: W, itemId: 'i1', fiscalPeriodId: 'fp-1', movementType: 'PURCHASE', quantity: 2, unitCost: 100, referenceType: 'invoice', referenceId: 'inv-1', createdBy: 'u1' },
                { tenantId: T, warehouseId: W, itemId: 'i1', fiscalPeriodId: 'fp-1', movementType: 'PURCHASE', quantity: 5, unitCost: 7, referenceType: 'invoice', referenceId: 'other', createdBy: 'u1' },
            ],
        });
        const { svc, postingFacade } = buildInvoicePosting(fake, invoiceFixture({
            status: 'POSTED', number: 'P-1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [],
        }));

        await svc.cancelInvoice(T, 'inv-1', 'u1');

        expect(movementRows(fake.state.movements.slice(2))).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'ADJUSTMENT', quantity: -2, unitCost: 100, referenceType: 'invoice_cancellation', referenceId: 'inv-1', notes: 'Cancellation of invoice P-1' },
        ]);
        expect(balanceRows(fake.state.balances)).toEqual([{ warehouseId: W, itemId: 'i1', quantity: 10, averageCost: 20 }]);
        expect(postingFacade.reverse).toHaveBeenCalledTimes(1);
    });

    it('stock count: STOCK_COUNT movements valued at averageCost (0 without a balance); zero and service lines skipped', async () => {
        const fake = createFakeInventoryTx({ balances: [{ tenantId: T, warehouseId: W, itemId: 'i1', quantity: 10, averageCost: 4 }] });
        const { svc, postingFacade } = buildStockCounts(fake, {
            id: 'sc-1', status: 'DRAFT', number: 'SC-1', warehouseId: W, fiscalPeriodId: 'fp-1', fiscalPeriod: { status: 'OPEN' },
            lines: [
                { itemId: 'i1', difference: -2 },
                { itemId: 'i2', difference: 5 },
                { itemId: 'i3', difference: 3 },
                { itemId: 'i4', difference: 0 },
            ],
        }, [
            { id: 'i1', itemType: 'product' }, { id: 'i2', itemType: 'service' },
            { id: 'i3', itemType: 'product' }, { id: 'i4', itemType: 'product' },
        ]);

        await svc.post(T, 'sc-1', 'u1');

        expect(movementRows(fake.state.movements)).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'STOCK_COUNT', quantity: -2, unitCost: 4, referenceType: 'stock_count', referenceId: 'sc-1', notes: 'Stock count adjustment: SC-1' },
            { warehouseId: W, itemId: 'i3', movementType: 'STOCK_COUNT', quantity: 3, unitCost: 0, referenceType: 'stock_count', referenceId: 'sc-1', notes: 'Stock count adjustment: SC-1' },
        ]);
        expect(balanceRows(fake.state.balances)).toEqual([
            { warehouseId: W, itemId: 'i1', quantity: 8, averageCost: 4 },
            { warehouseId: W, itemId: 'i3', quantity: 3, averageCost: 0 },
        ]);
        const [, intent] = postingFacade.record.mock.calls[0];
        expect(intent).toEqual(expect.objectContaining({ kind: 'STOCK_COUNT_ADJUSTED', netVariance: -8 }));
    });

    it('stock count: no GL posting when the net variance is zero', async () => {
        const fake = createFakeInventoryTx();
        const { svc, postingFacade } = buildStockCounts(fake, {
            id: 'sc-2', status: 'DRAFT', number: 'SC-2', warehouseId: W, fiscalPeriodId: 'fp-1', fiscalPeriod: { status: 'OPEN' },
            lines: [{ itemId: 'i3', difference: 3 }],
        }, [{ id: 'i3', itemType: 'product' }]);

        await svc.post(T, 'sc-2', 'u1');

        expect(fake.state.movements).toHaveLength(1);
        expect(postingFacade.record).not.toHaveBeenCalled();
    });

    it('opening stock: OPENING movements without a reference, one GL intent for the total value', async () => {
        const fake = createFakeInventoryTx();
        const postingFacade = postingFacadeMock();
        const svc = buildInventoryService(postingFacade);

        const result = await svc.registerOpeningStockTx(fake.client, {
            tenantId: T, userId: 'u1', warehouseId: W, fiscalPeriodId: 'fp-1', fiscalPeriodStatus: 'OPEN',
            items: [{ itemId: 'i1', quantity: 5, unitCost: 2 }, { itemId: 'i2', quantity: 1, unitCost: 10 }],
        });

        expect(movementRows(fake.state.movements)).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'OPENING', quantity: 5, unitCost: 2, referenceType: undefined, referenceId: undefined, notes: 'Opening Balance Registration' },
            { warehouseId: W, itemId: 'i2', movementType: 'OPENING', quantity: 1, unitCost: 10, referenceType: undefined, referenceId: undefined, notes: 'Opening Balance Registration' },
        ]);
        const [, intent] = postingFacade.record.mock.calls[0];
        expect(intent).toEqual(expect.objectContaining({ kind: 'OPENING_STOCK_POSTED', totalValue: 20, referenceId: W }));
        expect(result).toEqual({ count: 2, journalEntryId: 'je' });
    });
});
```

- [ ] **Step 4: Run it — it must pass on the unmodified code**

Run: `pnpm --filter @devloggers/api test -- movement-characterization`
Expected: `Tests: 7 passed, 7 total`.

If a test fails, **the fixture is wrong, not the code**: change the fixture to describe what the code actually does. Exception: if the failure exposes a genuine accounting bug, stop and report it rather than pinning it.

- [ ] **Step 5: Confirm the build excludes the helpers**

Run: `pnpm turbo run build --filter=@devloggers/api`
Expected: exit 0, and `apps/api/dist/modules/inventory/movements/__tests__` does not exist.

- [ ] **Step 6: Commit**

```bash
git add apps/api/tsconfig.build.json apps/api/src/modules/inventory/movements/__tests__
git commit -m "test(inventory): pin stock movement output before the movement port

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Movement contracts + `StockMovementWriter`

Introduces the vocabulary (intents, line drafts) and the persistence step. `StockMovementWriter.write` is a **copy** of the body of `InventoryService.postMovementTx`. The duplication is temporary: Task 5 deletes `postMovementTx`. Nothing calls the new code yet.

**Files:**
- Create: `apps/api/src/modules/inventory/movements/contracts/movement-intent.ts`
- Create: `apps/api/src/modules/inventory/movements/contracts/movement-line-draft.ts`
- Create: `apps/api/src/modules/inventory/movements/stock-movement.writer.ts`
- Test: `apps/api/src/modules/inventory/movements/stock-movement.writer.spec.ts`

**Interfaces:**
- Consumes: `createFakeInventoryTx`, `movementRows`, `balanceRows` (Task 1); `PrismaTransactionClient` from `modules/accounting/posting`.
- Produces:
  - `MovementIntent = PurchaseReceiptIntent | SaleIssueIntent | InvoiceReversalIntent | StockCountVarianceIntent | OpeningStockIntent`, discriminated on `kind`: `'PURCHASE_RECEIPT' | 'SALE_ISSUE' | 'INVOICE_REVERSAL' | 'STOCK_COUNT_VARIANCE' | 'OPENING_STOCK'`.
  - `MovementResult { movementIds: string[]; valueDelta: number }`.
  - `MovementLineDraft { warehouseId; itemId; movementType: StockMovementType; quantity; unitCost; referenceType?; referenceId?; notes? }`.
  - `MovementHeader { tenantId; userId; fiscalPeriodId }`.
  - `StockMovementWriter.write(tx: PrismaTransactionClient, header: MovementHeader, draft: MovementLineDraft): Promise<{ id: string }>`.

- [ ] **Step 1: Write the intent contracts**

```ts
// apps/api/src/modules/inventory/movements/contracts/movement-intent.ts
/**
 * Discriminated union of every stock event another module can report to
 * InventoryMovementFacade — the inventory counterpart of accounting's
 * PostingIntent. Fields describe *what happened* (which items, how many, at
 * what known cost). Everything that needs current stock state — availability
 * checks, average-cost valuation, finding the movements to reverse — is
 * resolved by the matching policy inside the caller's transaction, never by
 * the caller.
 */
export interface MovementIntentBase {
    tenantId: string;
    userId: string;
    fiscalPeriodId: string;
}

export interface PurchaseReceiptIntent extends MovementIntentBase {
    kind: 'PURCHASE_RECEIPT';
    warehouseId: string;
    invoiceId: string;
    /** unitCost is base currency, net of tax and discount, computed by the caller from the invoice line. */
    lines: { itemId: string; quantity: number; unitCost: number }[];
}

export interface SaleIssueIntent extends MovementIntentBase {
    kind: 'SALE_ISSUE';
    warehouseId: string;
    invoiceId: string;
    /**
     * quantity is the positive amount leaving stock. Lines are valued at the
     * balance's averageCost; fallbackUnitCost applies only when no balance row
     * exists (reachable only for zero-quantity lines, since availability is checked first).
     */
    lines: { itemId: string; quantity: number; fallbackUnitCost: number }[];
}

export interface InvoiceReversalIntent extends MovementIntentBase {
    kind: 'INVOICE_REVERSAL';
    invoiceId: string;
    /** Used only in the movement notes. */
    invoiceNumber: string;
}

export interface StockCountVarianceIntent extends MovementIntentBase {
    kind: 'STOCK_COUNT_VARIANCE';
    warehouseId: string;
    stockCountId: string;
    stockCountNumber: string;
    /** Signed counted − system difference. The caller passes only non-zero, non-service lines. */
    lines: { itemId: string; difference: number }[];
}

export interface OpeningStockIntent extends MovementIntentBase {
    kind: 'OPENING_STOCK';
    warehouseId: string;
    lines: { itemId: string; quantity: number; unitCost: number }[];
}

export type MovementIntent =
    | PurchaseReceiptIntent
    | SaleIssueIntent
    | InvoiceReversalIntent
    | StockCountVarianceIntent
    | OpeningStockIntent;

export interface MovementResult {
    movementIds: string[];
    /**
     * Σ(quantity × unitCost) over the persisted movements, in base currency,
     * accumulated in line order. Negative for issues: a sale's COGS is
     * Math.abs(valueDelta); a stock count's net variance is valueDelta itself.
     */
    valueDelta: number;
}
```

- [ ] **Step 2: Write the line-draft contract**

```ts
// apps/api/src/modules/inventory/movements/contracts/movement-line-draft.ts
import type { StockMovementType } from '@devloggers/db-prisma';

/** Shared by every movement an intent produces. */
export interface MovementHeader {
    tenantId: string;
    userId: string;
    fiscalPeriodId: string;
}

/** One stock movement a policy wants persisted. quantity is signed: negative leaves stock. */
export interface MovementLineDraft {
    warehouseId: string;
    itemId: string;
    movementType: StockMovementType;
    quantity: number;
    unitCost: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
}
```

- [ ] **Step 3: Write the failing writer spec**

These are the two cases from `inventory.service.spec.ts` (deleted in Task 5) plus the outflow case that spec never covered.

```ts
// apps/api/src/modules/inventory/movements/stock-movement.writer.spec.ts
import { StockMovementType } from '@devloggers/db-prisma';
import { StockMovementWriter } from './stock-movement.writer';
import { createFakeInventoryTx, movementRows, balanceRows } from './__tests__/fake-inventory-tx';

const header = { tenantId: 't1', userId: 'u1', fiscalPeriodId: 'fp1' };
const draft = { warehouseId: 'w1', itemId: 'i1', movementType: StockMovementType.PURCHASE, quantity: 10, unitCost: 5 };

describe('StockMovementWriter', () => {
    it('creates the movement and a new balance on first entry', async () => {
        const fake = createFakeInventoryTx();

        const { id } = await new StockMovementWriter().write(fake.client, header, draft);

        expect(id).toBe(fake.state.movements[0].id);
        expect(fake.state.movements[0]).toEqual(expect.objectContaining({ tenantId: 't1', fiscalPeriodId: 'fp1', createdBy: 'u1' }));
        expect(movementRows(fake.state.movements)).toEqual([
            { warehouseId: 'w1', itemId: 'i1', movementType: 'PURCHASE', quantity: 10, unitCost: 5, referenceType: undefined, referenceId: undefined, notes: undefined },
        ]);
        expect(balanceRows(fake.state.balances)).toEqual([{ warehouseId: 'w1', itemId: 'i1', quantity: 10, averageCost: 5 }]);
    });

    it('recomputes weighted-average cost on an inflow', async () => {
        const fake = createFakeInventoryTx({ balances: [{ tenantId: 't1', warehouseId: 'w1', itemId: 'i1', quantity: 10, averageCost: 4 }] });

        await new StockMovementWriter().write(fake.client, header, draft); // +10 @ 5 over 10 @ 4 => avg 4.5

        expect(balanceRows(fake.state.balances)).toEqual([{ warehouseId: 'w1', itemId: 'i1', quantity: 20, averageCost: 4.5 }]);
    });

    it('keeps averageCost on an outflow', async () => {
        const fake = createFakeInventoryTx({ balances: [{ tenantId: 't1', warehouseId: 'w1', itemId: 'i1', quantity: 10, averageCost: 4 }] });

        await new StockMovementWriter().write(fake.client, header, { ...draft, movementType: StockMovementType.SALE, quantity: -3, unitCost: 4 });

        expect(balanceRows(fake.state.balances)).toEqual([{ warehouseId: 'w1', itemId: 'i1', quantity: 7, averageCost: 4 }]);
    });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm --filter @devloggers/api test -- stock-movement.writer`
Expected: FAIL — `Cannot find module './stock-movement.writer'`.

- [ ] **Step 5: Write the writer**

The body is `InventoryService.postMovementTx` with `params` split into `header` + `draft`. Do not "improve" the arithmetic: the characterization suite depends on it.

```ts
// apps/api/src/modules/inventory/movements/stock-movement.writer.ts
import { Injectable } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../accounting/posting';
import type { MovementHeader, MovementLineDraft } from './contracts/movement-line-draft';

/**
 * Persistence step of the movement port: appends one StockMovement and keeps
 * the StockBalance cache in step (weighted-average cost on inflows; outflows
 * leave averageCost unchanged). Internal to inventory/movements — reach it
 * through InventoryMovementFacade.
 */
@Injectable()
export class StockMovementWriter {
    async write(tx: PrismaTransactionClient, header: MovementHeader, draft: MovementLineDraft): Promise<{ id: string }> {
        const movement = await tx.stockMovement.create({
            data: {
                tenantId: header.tenantId,
                warehouseId: draft.warehouseId,
                itemId: draft.itemId,
                fiscalPeriodId: header.fiscalPeriodId,
                movementType: draft.movementType,
                quantity: draft.quantity,
                unitCost: draft.unitCost,
                referenceType: draft.referenceType,
                referenceId: draft.referenceId,
                notes: draft.notes,
                createdBy: header.userId,
            },
        });

        const balance = await tx.stockBalance.findUnique({
            where: {
                tenantId_warehouseId_itemId: {
                    tenantId: header.tenantId,
                    warehouseId: draft.warehouseId,
                    itemId: draft.itemId,
                },
            },
        });

        if (!balance) {
            await tx.stockBalance.create({
                data: {
                    tenantId: header.tenantId,
                    warehouseId: draft.warehouseId,
                    itemId: draft.itemId,
                    quantity: draft.quantity,
                    averageCost: draft.unitCost,
                },
            });
        } else {
            const newQuantity = Number(balance.quantity) + draft.quantity;
            let newAverageCost = Number(balance.averageCost);
            if (draft.quantity > 0) {
                const totalValue = (Number(balance.quantity) * Number(balance.averageCost)) + (draft.quantity * draft.unitCost);
                newAverageCost = totalValue / newQuantity;
            }
            await tx.stockBalance.update({
                where: { id: balance.id },
                data: { quantity: newQuantity, averageCost: newAverageCost },
            });
        }

        return { id: movement.id };
    }
}
```

- [ ] **Step 6: Run the writer spec and the characterization suite**

Run: `pnpm --filter @devloggers/api test -- stock-movement.writer movement-characterization`
Expected: PASS — writer 3/3, characterization 7/7 (untouched).

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @devloggers/api typecheck`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/inventory/movements/contracts apps/api/src/modules/inventory/movements/stock-movement.writer.ts apps/api/src/modules/inventory/movements/stock-movement.writer.spec.ts
git commit -m "feat(inventory): add movement intent contracts and StockMovementWriter

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Movement policies, registry, `InventoryMovementFacade` + contract tests (§5.1.1, §5.1.5)

Mirrors `accounting/posting`: intent → policy → persist. **The one structural difference is deliberate.** A posting policy returns all journal lines at once. A movement policy is a *generator*: the facade persists each draft before asking for the next, so a policy that reads `stockBalance` for line 2 sees line 1's effect. This is what keeps the Task 1 interleaving test green.

**Files:**
- Create: `apps/api/src/modules/inventory/movements/policies/purchase-receipt.policy.ts`
- Create: `apps/api/src/modules/inventory/movements/policies/sale-issue.policy.ts`
- Create: `apps/api/src/modules/inventory/movements/policies/invoice-reversal.policy.ts`
- Create: `apps/api/src/modules/inventory/movements/policies/stock-count-variance.policy.ts`
- Create: `apps/api/src/modules/inventory/movements/policies/opening-stock.policy.ts`
- Create: `apps/api/src/modules/inventory/movements/movement-policy.registry.ts`
- Create: `apps/api/src/modules/inventory/movements/inventory-movement.facade.ts`
- Create: `apps/api/src/modules/inventory/movements/inventory-movements.module.ts`
- Create: `apps/api/src/modules/inventory/movements/index.ts`
- Create: `apps/api/src/modules/inventory/index.ts`
- Create: `apps/api/src/modules/inventory/movements/__tests__/build-movement-facade.ts`
- Test: `apps/api/src/modules/inventory/movements/inventory-movement.facade.spec.ts`

**Interfaces:**
- Consumes: contracts + `StockMovementWriter` (Task 2); fake tx helpers (Task 1).
- Produces:
  - `InventoryMovementFacade.apply(tx: PrismaTransactionClient, intent: MovementIntent): Promise<MovementResult>`
  - `InventoryMovementsModule` (exports `InventoryMovementFacade`)
  - `modules/inventory/movements` barrel: `InventoryMovementFacade`, `InventoryMovementsModule`, all intent types, `MovementResult`
  - `modules/inventory` barrel (the domain's public API): `InventoryModule`, `InventoryService`, plus everything the movements barrel exports
  - test helper `buildMovementFacade(): InventoryMovementFacade`

- [ ] **Step 1: Write the test helper and the failing contract spec**

```ts
// apps/api/src/modules/inventory/movements/__tests__/build-movement-facade.ts
import { InventoryMovementFacade } from '../inventory-movement.facade';
import { MovementPolicyRegistry } from '../movement-policy.registry';
import { StockMovementWriter } from '../stock-movement.writer';
import { PurchaseReceiptPolicy } from '../policies/purchase-receipt.policy';
import { SaleIssuePolicy } from '../policies/sale-issue.policy';
import { InvoiceReversalPolicy } from '../policies/invoice-reversal.policy';
import { StockCountVariancePolicy } from '../policies/stock-count-variance.policy';
import { OpeningStockPolicy } from '../policies/opening-stock.policy';

/** A real facade wired by hand — the same graph InventoryMovementsModule builds. */
export function buildMovementFacade(): InventoryMovementFacade {
    const registry = new MovementPolicyRegistry(
        new PurchaseReceiptPolicy(),
        new SaleIssuePolicy(),
        new InvoiceReversalPolicy(),
        new StockCountVariancePolicy(),
        new OpeningStockPolicy(),
    );
    return new InventoryMovementFacade(registry, new StockMovementWriter());
}
```

```ts
// apps/api/src/modules/inventory/movements/inventory-movement.facade.spec.ts
import { BadRequestException } from '@nestjs/common';
import { buildMovementFacade } from './__tests__/build-movement-facade';
import { createFakeInventoryTx, movementRows } from './__tests__/fake-inventory-tx';

const base = { tenantId: 't1', userId: 'u1', fiscalPeriodId: 'fp-1' };
const W = 'w1';

describe('InventoryMovementFacade — movement intent contracts', () => {
    it('PURCHASE_RECEIPT: one PURCHASE movement per line at the given cost', async () => {
        const fake = createFakeInventoryTx();

        const result = await buildMovementFacade().apply(fake.client, {
            ...base, kind: 'PURCHASE_RECEIPT', warehouseId: W, invoiceId: 'inv-1',
            lines: [{ itemId: 'i1', quantity: 2, unitCost: 100 }],
        });

        expect(movementRows(fake.state.movements)).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'PURCHASE', quantity: 2, unitCost: 100, referenceType: 'invoice', referenceId: 'inv-1', notes: undefined },
        ]);
        expect(result).toEqual({ movementIds: [fake.state.movements[0].id], valueDelta: 200 });
    });

    it('SALE_ISSUE: negative movements at averageCost; valueDelta is minus the cost of goods sold', async () => {
        const fake = createFakeInventoryTx({ balances: [
            { ...base, warehouseId: W, itemId: 'i1', quantity: 10, averageCost: 4 },
            { ...base, warehouseId: W, itemId: 'i2', quantity: 5, averageCost: 3 },
        ] });

        const result = await buildMovementFacade().apply(fake.client, {
            ...base, kind: 'SALE_ISSUE', warehouseId: W, invoiceId: 'inv-1',
            lines: [{ itemId: 'i1', quantity: 3, fallbackUnitCost: 9 }, { itemId: 'i2', quantity: 1, fallbackUnitCost: 10 }],
        });

        expect(movementRows(fake.state.movements)).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'SALE', quantity: -3, unitCost: 4, referenceType: 'invoice', referenceId: 'inv-1', notes: undefined },
            { warehouseId: W, itemId: 'i2', movementType: 'SALE', quantity: -1, unitCost: 3, referenceType: 'invoice', referenceId: 'inv-1', notes: undefined },
        ]);
        expect(result.valueDelta).toBe(-15);
    });

    it('SALE_ISSUE: rejects insufficient stock before writing anything for that line', async () => {
        const fake = createFakeInventoryTx();

        await expect(buildMovementFacade().apply(fake.client, {
            ...base, kind: 'SALE_ISSUE', warehouseId: W, invoiceId: 'inv-1',
            lines: [{ itemId: 'i1', quantity: 1, fallbackUnitCost: 9 }],
        })).rejects.toThrow(BadRequestException);
        expect(fake.state.movements).toHaveLength(0);
    });

    it('SALE_ISSUE: each line is checked against the balance left by the previous line', async () => {
        const fake = createFakeInventoryTx({ balances: [{ ...base, warehouseId: W, itemId: 'i1', quantity: 3, averageCost: 4 }] });

        await expect(buildMovementFacade().apply(fake.client, {
            ...base, kind: 'SALE_ISSUE', warehouseId: W, invoiceId: 'inv-1',
            lines: [{ itemId: 'i1', quantity: 2, fallbackUnitCost: 9 }, { itemId: 'i1', quantity: 2, fallbackUnitCost: 9 }],
        })).rejects.toThrow('Insufficient stock for item "i1". Available: 1, Requested: 2');
        expect(fake.state.movements).toHaveLength(1);
    });

    it('INVOICE_REVERSAL: negates only this invoice\'s movements at their recorded cost', async () => {
        const fake = createFakeInventoryTx({
            balances: [{ ...base, warehouseId: W, itemId: 'i1', quantity: 12, averageCost: 20 }],
            movements: [
                { ...base, warehouseId: W, itemId: 'i1', movementType: 'PURCHASE', quantity: 2, unitCost: 100, referenceType: 'invoice', referenceId: 'inv-1', createdBy: 'u1' },
                { ...base, warehouseId: W, itemId: 'i1', movementType: 'PURCHASE', quantity: 5, unitCost: 7, referenceType: 'invoice', referenceId: 'other', createdBy: 'u1' },
            ],
        });

        const result = await buildMovementFacade().apply(fake.client, {
            ...base, kind: 'INVOICE_REVERSAL', invoiceId: 'inv-1', invoiceNumber: 'P-1',
        });

        expect(movementRows(fake.state.movements.slice(2))).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'ADJUSTMENT', quantity: -2, unitCost: 100, referenceType: 'invoice_cancellation', referenceId: 'inv-1', notes: 'Cancellation of invoice P-1' },
        ]);
        expect(result.valueDelta).toBe(-200);
    });

    it('STOCK_COUNT_VARIANCE: values at averageCost, 0 when no balance exists; valueDelta is the net variance', async () => {
        const fake = createFakeInventoryTx({ balances: [{ ...base, warehouseId: W, itemId: 'i1', quantity: 10, averageCost: 4 }] });

        const result = await buildMovementFacade().apply(fake.client, {
            ...base, kind: 'STOCK_COUNT_VARIANCE', warehouseId: W, stockCountId: 'sc-1', stockCountNumber: 'SC-1',
            lines: [{ itemId: 'i1', difference: -2 }, { itemId: 'i3', difference: 3 }],
        });

        expect(movementRows(fake.state.movements)).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'STOCK_COUNT', quantity: -2, unitCost: 4, referenceType: 'stock_count', referenceId: 'sc-1', notes: 'Stock count adjustment: SC-1' },
            { warehouseId: W, itemId: 'i3', movementType: 'STOCK_COUNT', quantity: 3, unitCost: 0, referenceType: 'stock_count', referenceId: 'sc-1', notes: 'Stock count adjustment: SC-1' },
        ]);
        expect(result.valueDelta).toBe(-8);
    });

    it('OPENING_STOCK: OPENING movements with no reference', async () => {
        const fake = createFakeInventoryTx();

        const result = await buildMovementFacade().apply(fake.client, {
            ...base, kind: 'OPENING_STOCK', warehouseId: W,
            lines: [{ itemId: 'i1', quantity: 5, unitCost: 2 }, { itemId: 'i2', quantity: 1, unitCost: 10 }],
        });

        expect(movementRows(fake.state.movements)).toEqual([
            { warehouseId: W, itemId: 'i1', movementType: 'OPENING', quantity: 5, unitCost: 2, referenceType: undefined, referenceId: undefined, notes: 'Opening Balance Registration' },
            { warehouseId: W, itemId: 'i2', movementType: 'OPENING', quantity: 1, unitCost: 10, referenceType: undefined, referenceId: undefined, notes: 'Opening Balance Registration' },
        ]);
        expect(result.valueDelta).toBe(20);
    });

    it('an intent with no lines writes nothing', async () => {
        const fake = createFakeInventoryTx();

        const result = await buildMovementFacade().apply(fake.client, {
            ...base, kind: 'PURCHASE_RECEIPT', warehouseId: W, invoiceId: 'inv-1', lines: [],
        });

        expect(result).toEqual({ movementIds: [], valueDelta: 0 });
        expect(fake.tx.stockMovement.create).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @devloggers/api test -- inventory-movement.facade`
Expected: FAIL — `Cannot find module '../inventory-movement.facade'`.

- [ ] **Step 3: Write the two stateless policies (sync generators)**

```ts
// apps/api/src/modules/inventory/movements/policies/purchase-receipt.policy.ts
import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { PurchaseReceiptIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/** Goods received on a posted purchase invoice, at the invoice-derived net cost. */
@Injectable()
export class PurchaseReceiptPolicy {
    *drafts(_tx: PrismaTransactionClient, intent: PurchaseReceiptIntent): Generator<MovementLineDraft> {
        for (const line of intent.lines) {
            yield {
                warehouseId: intent.warehouseId,
                itemId: line.itemId,
                movementType: StockMovementType.PURCHASE,
                quantity: line.quantity,
                unitCost: line.unitCost,
                referenceType: 'invoice',
                referenceId: intent.invoiceId,
            };
        }
    }
}
```

```ts
// apps/api/src/modules/inventory/movements/policies/opening-stock.policy.ts
import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { OpeningStockIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/** Initial quantities at a known unit cost; the GL side is posted separately by InventoryService. */
@Injectable()
export class OpeningStockPolicy {
    *drafts(_tx: PrismaTransactionClient, intent: OpeningStockIntent): Generator<MovementLineDraft> {
        for (const line of intent.lines) {
            yield {
                warehouseId: intent.warehouseId,
                itemId: line.itemId,
                movementType: StockMovementType.OPENING,
                quantity: line.quantity,
                unitCost: line.unitCost,
                notes: 'Opening Balance Registration',
            };
        }
    }
}
```

- [ ] **Step 4: Write the three state-reading policies (async generators)**

Messages, reference types and fallbacks are copied from today's call sites. Do not reword them.

```ts
// apps/api/src/modules/inventory/movements/policies/sale-issue.policy.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { SaleIssueIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/**
 * Goods leaving on a posted sales invoice. Each line is checked for
 * availability and valued at averageCost *when it is pulled*, after earlier
 * lines have been persisted — so two lines for the same item compete for the
 * same stock, exactly as before the port.
 */
@Injectable()
export class SaleIssuePolicy {
    async *drafts(tx: PrismaTransactionClient, intent: SaleIssueIntent): AsyncGenerator<MovementLineDraft> {
        for (const line of intent.lines) {
            const balance = await tx.stockBalance.findUnique({
                where: { tenantId_warehouseId_itemId: { tenantId: intent.tenantId, warehouseId: intent.warehouseId, itemId: line.itemId } },
            });
            const currentQty = balance ? Number(balance.quantity) : 0;
            if (currentQty < line.quantity) {
                throw new BadRequestException(
                    `Insufficient stock for item "${line.itemId}". Available: ${currentQty}, Requested: ${line.quantity}`,
                );
            }
            yield {
                warehouseId: intent.warehouseId,
                itemId: line.itemId,
                movementType: StockMovementType.SALE,
                quantity: -line.quantity,
                unitCost: balance ? Number(balance.averageCost) : line.fallbackUnitCost,
                referenceType: 'invoice',
                referenceId: intent.invoiceId,
            };
        }
    }
}
```

```ts
// apps/api/src/modules/inventory/movements/policies/invoice-reversal.policy.ts
import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { InvoiceReversalIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/** Cancelling an invoice negates its original movements at their recorded cost, keeping averageCost exact. */
@Injectable()
export class InvoiceReversalPolicy {
    async *drafts(tx: PrismaTransactionClient, intent: InvoiceReversalIntent): AsyncGenerator<MovementLineDraft> {
        const originals = await tx.stockMovement.findMany({
            where: { tenantId: intent.tenantId, referenceType: 'invoice', referenceId: intent.invoiceId },
        });
        for (const mv of originals) {
            yield {
                warehouseId: mv.warehouseId,
                itemId: mv.itemId,
                movementType: StockMovementType.ADJUSTMENT,
                quantity: -Number(mv.quantity),
                unitCost: Number(mv.unitCost),
                referenceType: 'invoice_cancellation',
                referenceId: intent.invoiceId,
                notes: `Cancellation of invoice ${intent.invoiceNumber}`,
            };
        }
    }
}
```

```ts
// apps/api/src/modules/inventory/movements/policies/stock-count-variance.policy.ts
import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@devloggers/db-prisma';
import type { PrismaTransactionClient } from '../../../accounting/posting';
import type { StockCountVarianceIntent } from '../contracts/movement-intent';
import type { MovementLineDraft } from '../contracts/movement-line-draft';

/** Counted-vs-system differences, valued at averageCost (0 for an item with no balance yet). */
@Injectable()
export class StockCountVariancePolicy {
    async *drafts(tx: PrismaTransactionClient, intent: StockCountVarianceIntent): AsyncGenerator<MovementLineDraft> {
        for (const line of intent.lines) {
            const balance = await tx.stockBalance.findUnique({
                where: { tenantId_warehouseId_itemId: { tenantId: intent.tenantId, warehouseId: intent.warehouseId, itemId: line.itemId } },
            });
            yield {
                warehouseId: intent.warehouseId,
                itemId: line.itemId,
                movementType: StockMovementType.STOCK_COUNT,
                quantity: line.difference,
                unitCost: balance ? Number(balance.averageCost) : 0,
                referenceType: 'stock_count',
                referenceId: intent.stockCountId,
                notes: `Stock count adjustment: ${intent.stockCountNumber}`,
            };
        }
    }
}
```

- [ ] **Step 5: Write the registry**

```ts
// apps/api/src/modules/inventory/movements/movement-policy.registry.ts
import { Injectable } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../accounting/posting';
import type { MovementIntent } from './contracts/movement-intent';
import type { MovementLineDraft } from './contracts/movement-line-draft';
import { PurchaseReceiptPolicy } from './policies/purchase-receipt.policy';
import { SaleIssuePolicy } from './policies/sale-issue.policy';
import { InvoiceReversalPolicy } from './policies/invoice-reversal.policy';
import { StockCountVariancePolicy } from './policies/stock-count-variance.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';

export type MovementDraftSource = Iterable<MovementLineDraft> | AsyncIterable<MovementLineDraft>;

function assertNever(value: never): never {
    throw new Error(`Unhandled movement intent kind: ${JSON.stringify(value)}`);
}

/**
 * kind -> policy dispatch, exhaustively checked via assertNever so a new
 * MovementIntent member without a case is a compile error (same contract as
 * accounting's PostingPolicyRegistry).
 */
@Injectable()
export class MovementPolicyRegistry {
    constructor(
        private readonly purchaseReceipt: PurchaseReceiptPolicy,
        private readonly saleIssue: SaleIssuePolicy,
        private readonly invoiceReversal: InvoiceReversalPolicy,
        private readonly stockCountVariance: StockCountVariancePolicy,
        private readonly openingStock: OpeningStockPolicy,
    ) {}

    drafts(tx: PrismaTransactionClient, intent: MovementIntent): MovementDraftSource {
        switch (intent.kind) {
            case 'PURCHASE_RECEIPT':
                return this.purchaseReceipt.drafts(tx, intent);
            case 'SALE_ISSUE':
                return this.saleIssue.drafts(tx, intent);
            case 'INVOICE_REVERSAL':
                return this.invoiceReversal.drafts(tx, intent);
            case 'STOCK_COUNT_VARIANCE':
                return this.stockCountVariance.drafts(tx, intent);
            case 'OPENING_STOCK':
                return this.openingStock.drafts(tx, intent);
            default:
                return assertNever(intent);
        }
    }
}
```

- [ ] **Step 6: Write the facade**

```ts
// apps/api/src/modules/inventory/movements/inventory-movement.facade.ts
import { Injectable } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../accounting/posting';
import type { MovementIntent, MovementResult } from './contracts/movement-intent';
import { MovementPolicyRegistry } from './movement-policy.registry';
import { StockMovementWriter } from './stock-movement.writer';

/**
 * The single entry point other modules use to move stock. Runs inside the
 * caller's transaction so stock, GL and document status commit atomically.
 *
 * Each draft is persisted before the next is pulled from the policy: policies
 * read StockBalance lazily, so a later line always sees the earlier lines'
 * effect (availability and averageCost), matching pre-port behavior.
 */
@Injectable()
export class InventoryMovementFacade {
    constructor(
        private readonly registry: MovementPolicyRegistry,
        private readonly writer: StockMovementWriter,
    ) {}

    async apply(tx: PrismaTransactionClient, intent: MovementIntent): Promise<MovementResult> {
        const header = { tenantId: intent.tenantId, userId: intent.userId, fiscalPeriodId: intent.fiscalPeriodId };
        const movementIds: string[] = [];
        let valueDelta = 0;

        for await (const draft of this.registry.drafts(tx, intent)) {
            const { id } = await this.writer.write(tx, header, draft);
            movementIds.push(id);
            valueDelta += draft.quantity * draft.unitCost;
        }

        return { movementIds, valueDelta };
    }
}
```

- [ ] **Step 7: Run the contract spec**

Run: `pnpm --filter @devloggers/api test -- inventory-movement.facade`
Expected: PASS — `Tests: 8 passed, 8 total`.

- [ ] **Step 8: Write the Nest module and both barrels**

```ts
// apps/api/src/modules/inventory/movements/inventory-movements.module.ts
import { Module } from '@nestjs/common';
import { InventoryMovementFacade } from './inventory-movement.facade';
import { MovementPolicyRegistry } from './movement-policy.registry';
import { StockMovementWriter } from './stock-movement.writer';
import { PurchaseReceiptPolicy } from './policies/purchase-receipt.policy';
import { SaleIssuePolicy } from './policies/sale-issue.policy';
import { InvoiceReversalPolicy } from './policies/invoice-reversal.policy';
import { StockCountVariancePolicy } from './policies/stock-count-variance.policy';
import { OpeningStockPolicy } from './policies/opening-stock.policy';

@Module({
    providers: [
        InventoryMovementFacade,
        MovementPolicyRegistry,
        StockMovementWriter,
        PurchaseReceiptPolicy,
        SaleIssuePolicy,
        InvoiceReversalPolicy,
        StockCountVariancePolicy,
        OpeningStockPolicy,
    ],
    exports: [InventoryMovementFacade],
})
export class InventoryMovementsModule {}
```

```ts
// apps/api/src/modules/inventory/movements/index.ts
export { InventoryMovementFacade } from './inventory-movement.facade';
export { InventoryMovementsModule } from './inventory-movements.module';
export type {
    MovementIntent,
    MovementResult,
    PurchaseReceiptIntent,
    SaleIssueIntent,
    InvoiceReversalIntent,
    StockCountVarianceIntent,
    OpeningStockIntent,
} from './contracts/movement-intent';
```

```ts
// apps/api/src/modules/inventory/index.ts
/**
 * Public API of the inventory domain. Other domains import from
 * 'modules/inventory' only — deep imports are lint errors (Phase 5.2).
 * Files inside inventory must NOT import this barrel (use relative paths)
 * to avoid module-evaluation cycles.
 */
export { InventoryModule } from './inventory.module';
export { InventoryService } from './inventory.service';
export { InventoryMovementFacade, InventoryMovementsModule } from './movements';
export type {
    MovementIntent,
    MovementResult,
    PurchaseReceiptIntent,
    SaleIssueIntent,
    InvoiceReversalIntent,
    StockCountVarianceIntent,
    OpeningStockIntent,
} from './movements';
```

- [ ] **Step 9: Wire the movements module into `InventoryModule`**

In `apps/api/src/modules/inventory/inventory.module.ts`, add the import line and extend `imports`/`exports`:

```ts
import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryPresenter } from './presenters/inventory.presenter';
import { WarehousesModule } from './warehouses/warehouses.module';
import { InventoryMovementsModule } from './movements/inventory-movements.module';
import { PostingModule } from '../accounting/posting';

@Module({
    imports: [WarehousesModule, PostingModule, InventoryMovementsModule],
    controllers: [InventoryController],
    providers: [InventoryService, InventoryRepository, InventoryPresenter],
    exports: [InventoryService, WarehousesModule, InventoryMovementsModule],
})
export class InventoryModule {}
```

- [ ] **Step 10: Verify typecheck, lint on the new tree, and the whole API suite**

Run: `pnpm --filter @devloggers/api typecheck`
Expected: exit 0. (If TypeScript rejects `for await` over the `Iterable | AsyncIterable` union, that is a real finding. Convert the two sync policies to `async *drafts` and re-run lint; do not add a cast.)

Run: `pnpm --filter @devloggers/api exec eslint "src/modules/inventory/movements/**/*.ts"`
Expected: 0 errors.

Run: `pnpm --filter @devloggers/api test`
Expected: all suites pass. Expected totals: 22 suites, 103 tests (baseline 19/85 + Task 1 7 + Task 2 3 + Task 3 8).

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/inventory/movements apps/api/src/modules/inventory/index.ts apps/api/src/modules/inventory/inventory.module.ts
git commit -m "feat(inventory): add InventoryMovementFacade with typed movement intents

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Migrate invoice posting to the facade (§5.1.2)

After this task invoicing never touches `stockBalance`/`stockMovement` and never imports inventory internals. That is the spec's "Done when: Invoice post uses `InventoryMovementFacade` only".

**Files:**
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts`
- Modify: `apps/api/src/modules/invoicing/invoices/invoices.module.ts`
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.perpetual.spec.ts`
- Modify: `apps/api/src/modules/inventory/movements/__tests__/movement-characterization.spec.ts` (**`buildInvoicePosting` helper only**)

**Interfaces:**
- Consumes: `InventoryMovementFacade`, `PurchaseReceiptIntent`, `SaleIssueIntent`, `InvoiceReversalIntent` from the `modules/inventory` barrel (Task 3); `buildMovementFacade` (Task 3).
- Produces: `InvoicePostingService` constructor becomes `(prisma: PrismaService, movements: InventoryMovementFacade, postingFacade: AccountingPostingFacade)`. The public method signatures are unchanged.

- [ ] **Step 1: Rewrite the unit spec against the new collaborator (failing)**

Replace `apps/api/src/modules/invoicing/invoices/invoice-posting.perpetual.spec.ts` with:

```ts
import { InvoicePostingService } from './invoice-posting.service';
import { AccountingPostingFacade } from '../../accounting/posting';

function deps(valueDelta = 0) {
    const tx = {
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv', status: 'POSTED' }) },
        item: { update: jest.fn() },
    };
    const prisma = { invoice: { findFirst: jest.fn() }, $transaction: jest.fn((cb: any) => cb(tx)) } as any;
    const movements = { apply: jest.fn().mockResolvedValue({ movementIds: [], valueDelta }) } as any;
    const postingFacade = {
        record: jest.fn().mockResolvedValue({ journalEntryId: 'je' }),
        reverse: jest.fn().mockResolvedValue({ journalEntryId: 'je-r' }),
    } as unknown as AccountingPostingFacade;
    return { svc: new InvoicePostingService(prisma, movements, postingFacade), prisma, tx, movements, postingFacade };
}
const stockLine = { itemId: 'i1', quantity: 2, unitPrice: 300, total: 600, taxAmount: 0, item: { itemType: 'product' } };

describe('InvoicePostingService — perpetual', () => {
    it('purchase: reports a PURCHASE_RECEIPT at net unit cost and capitalizes stock lines', async () => {
        const { svc, prisma, tx, movements, postingFacade } = deps();
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'P1',
            exchangeRate: 1, subtotal: 600, discountAmount: 0, taxAmount: 0, total: 600, partyId: 'p1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [stockLine],
            fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postPurchaseInvoice('t', 'inv', 'u');
        expect(movements.apply).toHaveBeenCalledWith(tx, expect.objectContaining({
            kind: 'PURCHASE_RECEIPT', warehouseId: 'w1', invoiceId: 'inv',
            lines: [{ itemId: 'i1', quantity: 2, unitCost: 300 }],
        }));
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        expect(intent.inventoryAmount).toBe(600);
    });

    it('purchase: capitalizes stock at NET-of-discount cost so GL debit equals ledger cost', async () => {
        const { svc, prisma, tx, movements, postingFacade } = deps();
        const discountedLine = { itemId: 'i1', quantity: 2, unitPrice: 300, total: 500, taxAmount: 0, item: { itemType: 'product' } };
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'P2',
            exchangeRate: 1, subtotal: 500, discountAmount: 0, taxAmount: 0, total: 500, partyId: 'p1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [discountedLine],
            fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postPurchaseInvoice('t', 'inv', 'u');
        expect(movements.apply).toHaveBeenCalledWith(tx, expect.objectContaining({ lines: [{ itemId: 'i1', quantity: 2, unitCost: 250 }] }));
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        expect(intent.inventoryAmount).toBe(500);
    });

    it('sale: cogsTotal is the magnitude of the SALE_ISSUE valueDelta, no rate applied', async () => {
        const { svc, prisma, movements, postingFacade } = deps(-6);
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'S1',
            exchangeRate: 1, subtotal: 1000, discountAmount: 0, taxAmount: 0, total: 1000, partyId: 'p1',
            invoiceType: { direction: 'SALE', affectsStock: true }, lines: [{ ...stockLine, quantity: 2, unitPrice: 500, total: 1000 }],
            fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postSalesInvoice('t', 'inv', 'u');
        expect(movements.apply).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            kind: 'SALE_ISSUE', lines: [{ itemId: 'i1', quantity: 2, fallbackUnitCost: 500 }],
        }));
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
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

- [ ] **Step 2: Point the characterization helper at the new constructor**

In `movement-characterization.spec.ts`, add the import and replace **only** `buildInvoicePosting`:

```ts
import { buildMovementFacade } from './build-movement-facade';
```

```ts
function buildInvoicePosting(fake: FakeTx, invoice: Record<string, unknown>) {
    const postingFacade = postingFacadeMock();
    const prisma = {
        invoice: { findFirst: jest.fn().mockResolvedValue(invoice) },
        journalEntry: { findFirst: jest.fn().mockResolvedValue({ id: 'je-1' }) },
        $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(fake.client)),
    };
    const svc = new InvoicePostingService(prisma as any, buildMovementFacade(), postingFacade as any);
    return { svc, postingFacade };
}
```

- [ ] **Step 3: Run both specs to verify they fail**

Run: `pnpm --filter @devloggers/api test -- invoice-posting.perpetual movement-characterization`
Expected: FAIL. The perpetual spec fails because `movements.apply` is never called (the service still calls `postMovementTx` on the object in the second constructor slot → `TypeError: ... postMovementTx is not a function`). The characterization invoice tests fail the same way. The stock-count and opening-stock characterization tests still pass.

- [ ] **Step 4: Rewrite `invoice-posting.service.ts`**

Replace the whole file with the version below. Validation, GL intents, status updates and ordering are unchanged. Only stock handling moves behind the facade. Two small notes:
- The purchase `if (invoice.invoiceType.affectsStock)` wrapper is gone because `stockLines` is already `[]` when `affectsStock` is false, and an intent with no lines writes nothing (contract test in Task 3).
- `latestPurchasePrice` updates now run after all movements rather than between them. They touch a different table in the same transaction, so nothing observable changes.

```ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { ReferenceType } from '@devloggers/db-prisma';
import {
    InventoryMovementFacade,
    type PurchaseReceiptIntent,
    type SaleIssueIntent,
    type InvoiceReversalIntent,
} from '../../inventory';
import { AccountingPostingFacade, type InvoicePostedIntent, type InvoiceCancelledIntent } from '../../accounting/posting';
import { assertFiscalPeriodOpen } from '../../accounting/accounts/utils/assert-period-open';

@Injectable()
export class InvoicePostingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly movements: InventoryMovementFacade,
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
        const warehouseId = invoice.warehouseId;
        if (!warehouseId) throw new BadRequestException('Purchase invoice must have a warehouse assigned');
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
            currencyId: invoice.currencyId,
            netAmount,
            taxAmount: Number(invoice.taxAmount),
            total: Number(invoice.total),
            inventoryAmount,
        };

        const receipt: PurchaseReceiptIntent = {
            kind: 'PURCHASE_RECEIPT',
            tenantId,
            userId,
            fiscalPeriodId: invoice.fiscalPeriodId,
            warehouseId,
            invoiceId: invoice.id,
            // Base-currency net unit cost: tax-exclusive line total / qty × locked rate.
            lines: stockLines.map((line) => ({
                itemId: line.itemId,
                quantity: Number(line.quantity),
                unitCost: (Number(line.total) - Number(line.taxAmount)) / Number(line.quantity) * exchangeRate,
            })),
        };

        return this.prisma.$transaction(async (tx) => {
            await this.movements.apply(tx, receipt);
            for (const line of stockLines) {
                await tx.item.update({ where: { id: line.itemId }, data: { latestPurchasePrice: line.unitPrice } });
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
        const warehouseId = invoice.warehouseId;
        if (!warehouseId) throw new BadRequestException('Sales invoice must have a warehouse assigned');
        if (invoice.lines.length === 0) throw new BadRequestException('Invoice must have at least one line');

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);

        // Stock lines drive COGS (base-currency averageCost); services have no COGS leg.
        const stockLines = invoice.invoiceType.affectsStock
            ? invoice.lines.filter((l) => l.item.itemType !== 'service')
            : [];

        const issue: SaleIssueIntent = {
            kind: 'SALE_ISSUE',
            tenantId,
            userId,
            fiscalPeriodId: invoice.fiscalPeriodId,
            warehouseId,
            invoiceId: invoice.id,
            lines: stockLines.map((line) => ({
                itemId: line.itemId,
                quantity: Number(line.quantity),
                fallbackUnitCost: Number(line.unitPrice),
            })),
        };

        return this.prisma.$transaction(async (tx) => {
            const { valueDelta } = await this.movements.apply(tx, issue);
            // An issue's valueDelta is Σ(−qty × averageCost) ≤ 0; COGS is its magnitude.
            const cogsTotal = Math.abs(valueDelta);

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
                currencyId: invoice.currencyId,
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

        const reversal: InvoiceReversalIntent = {
            kind: 'INVOICE_REVERSAL',
            tenantId,
            userId,
            fiscalPeriodId: invoice.fiscalPeriodId,
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
        };

        return this.prisma.$transaction(async (tx) => {
            await this.movements.apply(tx, reversal);

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

- [ ] **Step 5: Import `InventoryModule` through the barrel**

In `apps/api/src/modules/invoicing/invoices/invoices.module.ts`, replace

```ts
import { InventoryModule } from '../../inventory/inventory.module';
```

with

```ts
import { InventoryModule } from '../../inventory';
```

- [ ] **Step 6: Run both specs, then the full suite**

Run: `pnpm --filter @devloggers/api test -- invoice-posting.perpetual movement-characterization`
Expected: PASS — perpetual 4/4, characterization 7/7 with **no assertion edited**.

Run: `pnpm --filter @devloggers/api typecheck && pnpm --filter @devloggers/api test`
Expected: typecheck exit 0; 22 suites / 103 tests pass.

- [ ] **Step 7: Prove invoicing no longer reaches into inventory tables**

Run: `git grep -nE "stockBalance|stockMovement|postMovementTx|inventory/inventory\." -- apps/api/src/modules/invoicing ':!*.spec.ts'`
Expected: no output (exit 1).

- [ ] **Step 8: Verify the app still boots its DI graph**

`pnpm generate` bootstraps every Nest module without a database, so a missing provider fails here rather than at runtime. `openapi.yaml` already had unrelated local changes before this plan, so compare fingerprints instead of expecting a clean diff:

Run: `git diff apps/api/openapi.yaml | sha1sum` → note the hash
Run: `pnpm generate`
Expected: exit 0
Run: `git diff apps/api/openapi.yaml | sha1sum`
Expected: the same hash as before (this task changes no routes or DTOs).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts apps/api/src/modules/invoicing/invoices/invoices.module.ts apps/api/src/modules/invoicing/invoices/invoice-posting.perpetual.spec.ts apps/api/src/modules/inventory/movements/__tests__/movement-characterization.spec.ts
git commit -m "refactor(invoicing): post invoice stock through InventoryMovementFacade

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Migrate stock counts and opening stock; delete the old engine (§5.1.3, §5.1.4)

**Files:**
- Modify: `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts`
- Modify: `apps/api/src/modules/inventory/inventory.service.ts`
- Delete: `apps/api/src/modules/inventory/inventory.service.spec.ts` (its cases now live in `stock-movement.writer.spec.ts`)
- Modify: `apps/api/src/modules/catalog/items/items.module.ts`
- Modify: `apps/api/src/modules/catalog/items/services/items.service.ts`
- Modify: `apps/api/src/modules/inventory/movements/__tests__/movement-characterization.spec.ts` (**`buildInventoryService` and `buildStockCounts` helpers only**)

**Interfaces:**
- Consumes: `InventoryMovementFacade`, `StockCountVarianceIntent`, `OpeningStockIntent` (Task 3); `buildMovementFacade` (Task 3).
- Produces:
  - `StockCountsService` constructor: `(prisma, movements: InventoryMovementFacade, docSeqService, stockCountsRepository, stockCountPresenter, eventEmitter, postingFacade)`. The second slot changes from `InventoryService`.
  - `InventoryService` constructor: `(prisma, inventoryRepository, inventoryPresenter, postingFacade, movements: InventoryMovementFacade)`.
  - **Removed:** `InventoryService.postMovementTx`, `InventoryService.postMovement`, the `MovementParams` interface.

- [ ] **Step 1: Point the characterization helpers at the new constructors (failing)**

In `movement-characterization.spec.ts`, replace **only** these two helpers:

```ts
function buildInventoryService(postingFacade: ReturnType<typeof postingFacadeMock>) {
    return new InventoryService({} as any, {} as any, {} as any, postingFacade as any, buildMovementFacade());
}
```

```ts
function buildStockCounts(fake: FakeTx, stockCount: Record<string, unknown>, itemTypes: { id: string; itemType: string }[]) {
    const postingFacade = postingFacadeMock();
    const prisma = {
        item: { findMany: jest.fn().mockResolvedValue(itemTypes) },
        $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(fake.client)),
    };
    const repo = { findById: jest.fn().mockResolvedValue(stockCount) };
    const presenter = { toDetailResponse: jest.fn((x: unknown) => x) };
    const emitter = { emit: jest.fn() };
    const svc = new StockCountsService(
        prisma as any, buildMovementFacade(), {} as any, repo as any, presenter as any, emitter as any, postingFacade as any,
    );
    return { svc, postingFacade };
}
```

- [ ] **Step 2: Run to verify the stock-count and opening-stock cases fail**

Run: `pnpm --filter @devloggers/api test -- movement-characterization`
Expected: FAIL. If ts-jest runs type diagnostics, the whole suite fails with `Expected 4 arguments, but got 5`. If it transpiles only, the two stock-count cases fail at runtime with `this.inventoryService.postMovementTx is not a function`. Either is the red. Then run `pnpm --filter @devloggers/api typecheck` and confirm it reports the constructor-arity error.

- [ ] **Step 3: Migrate `StockCountsService.post`**

In `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts`:

Replace the import block's first seven lines

```ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { StockMovementType } from '@devloggers/db-prisma';
import { InventoryService } from '../inventory.service';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { AccountingPostingFacade, type StockCountAdjustedIntent } from '../../accounting/posting';
```

with

```ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { InventoryMovementFacade, type StockCountVarianceIntent } from '../movements';
import { DocumentSequencesService } from '../../accounting/document-sequences/services/document-sequences.service';
import { AccountingPostingFacade, type StockCountAdjustedIntent } from '../../accounting/posting';
```

In the constructor replace

```ts
        private readonly inventoryService: InventoryService,
```

with

```ts
        private readonly movements: InventoryMovementFacade,
```

Replace the whole `post` method with:

```ts
    async post(tenantId: string, id: string, userId: string) {
        const stockCount = await this.stockCountsRepository.findById(tenantId, id);
        if (!stockCount) throw new NotFoundException('Stock count not found');
        if (stockCount.status !== 'DRAFT') throw new BadRequestException('Only draft stock counts can be posted');
        assertFiscalPeriodOpen(stockCount.fiscalPeriod?.status);

        const itemTypes = await this.prisma.item.findMany({
            where: { tenantId, id: { in: stockCount.lines.map((l) => l.itemId) } },
            select: { id: true, itemType: true },
        });
        const itemTypeMap = new Map(itemTypes.map((i) => [i.id, i.itemType]));

        const variance: StockCountVarianceIntent = {
            kind: 'STOCK_COUNT_VARIANCE',
            tenantId,
            userId,
            fiscalPeriodId: stockCount.fiscalPeriodId,
            warehouseId: stockCount.warehouseId,
            stockCountId: id,
            stockCountNumber: stockCount.number,
            lines: stockCount.lines
                .map((line) => ({ itemId: line.itemId, difference: Number(line.difference) }))
                .filter((line) => line.difference !== 0 && itemTypeMap.get(line.itemId) !== 'service'),
        };

        return this.prisma.$transaction(async (tx) => {
            // For a variance, valueDelta is the signed net variance at averageCost.
            const { valueDelta: netVariance } = await this.movements.apply(tx, variance);

            if (netVariance !== 0) {
                const intent: StockCountAdjustedIntent = {
                    kind: 'STOCK_COUNT_ADJUSTED',
                    tenantId,
                    userId,
                    date: new Date(),
                    fiscalPeriodId: stockCount.fiscalPeriodId,
                    fiscalPeriodStatus: stockCount.fiscalPeriod?.status,
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
```

Two `(stockCount as any).fiscalPeriod?.status` casts are gone (§5.1.4). `StockCountsRepository.findById` already includes `fiscalPeriod: { select: { status: true } }`, so the inferred type carries it. The event-payload `as any` casts are unrelated to movements and stay out of scope.

- [ ] **Step 4: Migrate `InventoryService` and delete the old engine**

Replace `apps/api/src/modules/inventory/inventory.service.ts` with:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { PostOpeningBalanceDto } from './dto/inventory.dto';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryPresenter } from './presenters/inventory.presenter';
import { InventoryMovementFacade } from './movements';
import { AccountingPostingFacade, type OpeningStockPostedIntent, type PrismaTransactionClient } from '../accounting/posting';
import { assertFiscalPeriodOpen } from '../accounting/accounts/utils/assert-period-open';

@Injectable()
export class InventoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly inventoryRepository: InventoryRepository,
        private readonly inventoryPresenter: InventoryPresenter,
        private readonly postingFacade: AccountingPostingFacade,
        private readonly movements: InventoryMovementFacade,
    ) {}

    async registerOpeningStockTx(
        tx: PrismaTransactionClient,
        params: {
            tenantId: string;
            userId: string;
            warehouseId: string;
            fiscalPeriodId: string;
            fiscalPeriodStatus?: string | undefined;
            items: { itemId: string; quantity: number; unitCost: number }[];
        },
    ): Promise<{ count: number; journalEntryId: string | null }> {
        const totalValue = params.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);

        await this.movements.apply(tx, {
            kind: 'OPENING_STOCK',
            tenantId: params.tenantId,
            userId: params.userId,
            fiscalPeriodId: params.fiscalPeriodId,
            warehouseId: params.warehouseId,
            lines: params.items,
        });

        let journalEntryId: string | null = null;
        if (totalValue !== 0) {
            const intent: OpeningStockPostedIntent = {
                kind: 'OPENING_STOCK_POSTED',
                tenantId: params.tenantId,
                userId: params.userId,
                date: new Date(),
                fiscalPeriodId: params.fiscalPeriodId,
                fiscalPeriodStatus: params.fiscalPeriodStatus,
                exchangeRate: 1,
                referenceId: params.warehouseId,
                description: 'Opening inventory balance',
                totalValue,
            };
            const result = await this.postingFacade.record(tx, intent);
            journalEntryId = result.journalEntryId;
        }

        return { count: params.items.length, journalEntryId };
    }

    async registerOpeningBalance(tenantId: string, userId: string, dto: PostOpeningBalanceDto) {
        const period = await this.prisma.fiscalPeriod.findFirst({
            where: { id: dto.fiscalPeriodId, tenantId },
            select: { status: true },
        });
        assertFiscalPeriodOpen(period?.status);

        return this.prisma.$transaction((tx) =>
            this.registerOpeningStockTx(tx, {
                tenantId,
                userId,
                warehouseId: dto.warehouseId,
                fiscalPeriodId: dto.fiscalPeriodId,
                fiscalPeriodStatus: period?.status,
                items: dto.items,
            }),
        );
    }

    async getBalances(tenantId: string, filters: { warehouseId?: string; itemId?: string }) {
        const balances = await this.inventoryRepository.getBalances(tenantId, filters);
        return this.inventoryPresenter.toResponseList(balances);
    }
}
```

`postMovement` had no callers (Task 0). `postMovementTx` has none after Step 3. Delete the old spec:

Run: `git rm apps/api/src/modules/inventory/inventory.service.spec.ts`

- [ ] **Step 5: Switch catalog to the inventory barrel**

In `apps/api/src/modules/catalog/items/items.module.ts` replace

```ts
import { InventoryModule } from '@/modules/inventory/inventory.module';
```

with

```ts
import { InventoryModule } from '@/modules/inventory';
```

In `apps/api/src/modules/catalog/items/services/items.service.ts` replace

```ts
import { InventoryService } from '@/modules/inventory/inventory.service';
```

with

```ts
import { InventoryService } from '@/modules/inventory';
```

- [ ] **Step 6: Run the characterization suite and everything else**

Run: `pnpm --filter @devloggers/api test -- movement-characterization`
Expected: PASS 7/7, **no assertion edited since Task 1**. Confirm with `git diff <task-1-commit> -- apps/api/src/modules/inventory/movements/__tests__/movement-characterization.spec.ts`: the only changed hunks are inside `buildInventoryService`, `buildInvoicePosting`, `buildStockCounts`, and the added `buildMovementFacade` import.

Run: `pnpm --filter @devloggers/api typecheck && pnpm --filter @devloggers/api test`
Expected: typecheck exit 0; **21 suites, 101 tests** (Task 3's 22/103 minus the deleted spec's 1 suite / 2 tests).

- [ ] **Step 7: Prove the spec's "no direct movement call sites" claim**

Run: `git grep -nE "postMovementTx|postMovement\(|MovementParams" -- apps/api/src`
Expected: no output.

Run: `git grep -nE "stockMovement\.(create|update)|stockBalance\.(create|update|findUnique)" -- apps/api/src ':!*.spec.ts' ':!**/__tests__/**'`
Expected: matches only in `inventory/movements/stock-movement.writer.ts` and `inventory/movements/policies/*.policy.ts`.

Run: `git grep -n "tx as any" -- apps/api/src`
Expected: no output.

- [ ] **Step 8: DI smoke check**

Run: `git diff apps/api/openapi.yaml | sha1sum` → note the hash
Run: `pnpm generate`
Expected: exit 0, and `git diff apps/api/openapi.yaml | sha1sum` prints the same hash.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/inventory apps/api/src/modules/catalog/items/items.module.ts apps/api/src/modules/catalog/items/services/items.service.ts
git commit -m "refactor(inventory): route stock counts and opening stock through the movement facade

Removes InventoryService.postMovementTx/postMovement; the facade is now the
only way to write stock movements.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Part B — Domain boundary lint (spec §5.2)

### Task 6: Table-driven boundary config + a script that proves the rule fires (no behavior change)

The Phase 1 accounting rule moves verbatim into a table, and nothing else changes. What this adds is proof: CI will now fail if the rule silently stops matching, for example after a glob edit or an ESLint upgrade.

**Why per-importer blocks:** in flat config, when two config objects set `no-restricted-imports` for the same file, the later one **replaces** the earlier options; they are not merged. One block per restricted domain would therefore silently cancel the accounting rule. The generator emits one block per *importing* domain, and each block lists every *other* domain's restrictions.

**Files:**
- Create: `apps/api/eslint/domain-boundaries.mjs`
- Modify: `apps/api/eslint.config.mjs`
- Create: `apps/api/scripts/check-architecture-rules.mjs`
- Modify: `apps/api/package.json` (add script)
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `DOMAINS: string[]`, `DOMAIN_RESTRICTIONS: Record<string, { group: string[]; message: string }>`, `domainBoundaryConfigs()` from `apps/api/eslint/domain-boundaries.mjs`; `pnpm --filter @devloggers/api lint:architecture`. Tasks 7 and 11 add entries and cases.

- [ ] **Step 1: Write the regression script with Phase 1 parity cases**

Create `apps/api/scripts/check-architecture-rules.mjs` (the shebang must stay on line 1):

```js
#!/usr/bin/env node
/**
 * Phase 5.2.3 — prove the architecture lint rules actually fire.
 *
 * `lint:ci` only shows that today's code has no violations, and that stays
 * true if a rule quietly stops matching (a glob typo, an ESLint upgrade, a
 * later config object overriding an earlier one). This script lints small
 * probe snippets through the real apps/api ESLint config, using real files as
 * the host path so file-scoped blocks apply, and asserts which ones error.
 *
 * Usage: pnpm --filter @devloggers/api lint:architecture
 */
import { ESLint } from 'eslint';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const API_DIR = resolve(import.meta.dirname, '..');

/**
 * @typedef {{ name: string; file: string; code: string; rule: string; expect: 'error' | 'clean' }} Case
 */

/**
 * @param {string} file
 * @param {string} specifier
 * @param {'error' | 'clean'} expect
 * @returns {Case}
 */
function importCase(file, specifier, expect) {
    return {
        name: `${file} imports '${specifier}'`,
        file,
        code: `import * as probe from '${specifier}';\nexport const used = probe;\n`,
        rule: 'no-restricted-imports',
        expect,
    };
}

const INVOICE_POSTING = 'src/modules/invoicing/invoices/invoice-posting.service.ts';
const ONBOARDING = 'src/modules/identity/onboarding/services/onboarding.service.ts';
const POSTING_FACADE = 'src/modules/accounting/posting/accounting-posting.facade.ts';

/** @type {Case[]} */
const CASES = [
    // ── Phase 1 accounting boundary (must keep behaving exactly as before) ──
    importCase(INVOICE_POSTING, '../../accounting/accounts/services/journal-posting.service', 'error'),
    importCase(INVOICE_POSTING, '../../accounting/accounts/accounts.module', 'error'),
    importCase(INVOICE_POSTING, '../../accounting/posting/posting-policy.registry', 'clean'),
    importCase(INVOICE_POSTING, '../../accounting/posting', 'clean'),
    importCase(INVOICE_POSTING, '../../accounting/accounts/utils/assert-period-open', 'clean'),
    importCase(ONBOARDING, '../../../accounting/fiscal-periods/services/fiscal-periods.service', 'clean'),
    importCase(ONBOARDING, '../../../accounting/financial-settings/financial-settings.module', 'clean'),
    importCase(ONBOARDING, '@/modules/accounting/accounts/services/journal-posting.service', 'error'),
    // A domain may deep-import itself.
    importCase(POSTING_FACADE, '../accounts/services/journal-posting.service', 'clean'),
];

async function main() {
    const eslint = new ESLint({ cwd: API_DIR });
    let failures = 0;

    for (const c of CASES) {
        const filePath = join(API_DIR, c.file);
        if (!existsSync(filePath)) {
            console.error(`✗ ${c.name}\n    probe host file does not exist: ${c.file}`);
            failures++;
            continue;
        }
        const [result] = await eslint.lintText(c.code, { filePath });
        const fatal = result.messages.find((m) => m.fatal);
        if (fatal) {
            console.error(`✗ ${c.name}\n    parse error: ${fatal.message}`);
            failures++;
            continue;
        }
        const fired = result.messages.some((m) => m.ruleId === c.rule && m.severity === 2);
        const ok = c.expect === 'error' ? fired : !fired;
        console.log(`${ok ? '✓' : '✗'} [expect ${c.expect}] ${c.name}`);
        if (!ok) failures++;
    }

    if (failures > 0) {
        console.error(`\n${failures} architecture-rule case(s) failed.`);
        process.exit(1);
    }
    console.log(`\nAll ${CASES.length} architecture-rule cases passed.`);
}

await main();
```

Add to `apps/api/package.json` `scripts`, directly after `"lint:ci"`:

```json
    "lint:architecture": "node scripts/check-architecture-rules.mjs",
```

- [ ] **Step 2: Run it against the current config — it must pass**

This pins today's behavior before the refactor.

Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: `All 9 architecture-rule cases passed.`

If a case reports a **parse error**, the probe host is outside the tsconfig project; pick a host file that exists under `src/`. Never weaken the config to make the script pass.

- [ ] **Step 3: Write the boundary table (accounting only, copied verbatim)**

```js
// apps/api/eslint/domain-boundaries.mjs
// @ts-check
/**
 * Domain boundaries for apps/api (Phase 1 accounting rule, generalized in Phase 5.2).
 *
 * Every directory directly under src/modules is a domain. DOMAIN_RESTRICTIONS
 * says, per domain, which import paths OTHER domains may not use. A domain may
 * always deep-import itself.
 *
 * Why one config block per *importing* domain: flat config does not merge
 * options for the same rule — a later block setting no-restricted-imports for
 * a file replaces an earlier one. So each importer gets a single block that
 * lists every other domain's restrictions.
 *
 * Pattern semantics are gitignore's (the `ignore` package): a negation cannot
 * re-include a path whose parent directory is still excluded, so to publish a
 * sub-path you must first un-block its parent, then re-block the parent's
 * other children. See the accounting entry.
 *
 * Proven by scripts/check-architecture-rules.mjs (CI: lint:architecture).
 * Documented in .ai/rules/api.md § Domain boundaries.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const MODULES_DIR = join(import.meta.dirname, '..', 'src', 'modules');
const TEST_IGNORES = ['**/*.spec.ts', '**/*.spec-fixtures.ts', '**/__tests__/**'];

/** @type {string[]} */
export const DOMAINS = readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

/** @type {Record<string, { group: string[]; message: string }>} */
export const DOMAIN_RESTRICTIONS = {
    // Phase 1 boundary (F1): GL account-resolution / journal-posting internals
    // (accounting/accounts/services — JournalPostingService, OpeningBalancesService,
    // AccountsService, ...) may only be reached from outside accounting via the
    // accounting/posting barrel (AccountingPostingFacade + PostingIntent types).
    // Exempted as NOT GL-policy, and confirmed still legitimately imported directly
    // as of Phase 1: document-sequences (document numbering, unrelated to which GL
    // account gets hit), financial-settings + fiscal-periods (onboarding writes tenant
    // setup config, doesn't consume it for posting), accounts/utils (assertFiscalPeriodOpen /
    // assertAccountFitsSlot — shared guards, not account resolution). See
    // docs/superpowers/plans/2026-07-26-phase-1-gl-posting-port.md Task 18.
    accounting: {
        group: [
            '**/accounting/*',
            '**/accounting/*/**',
            '!**/accounting/posting',
            '!**/accounting/posting/**',
            '!**/accounting/document-sequences',
            '!**/accounting/document-sequences/**',
            '!**/accounting/financial-settings',
            '!**/accounting/financial-settings/**',
            '!**/accounting/fiscal-periods',
            '!**/accounting/fiscal-periods/**',
            '!**/accounting/accounts',
            '!**/accounting/accounts/**',
            '**/accounting/accounts/accounts.module',
            '**/accounting/accounts/services',
            '**/accounting/accounts/services/**',
            '**/accounting/accounts/repositories',
            '**/accounting/accounts/repositories/**',
            '**/accounting/accounts/presenters',
            '**/accounting/accounts/presenters/**',
            '**/accounting/accounts/controllers',
            '**/accounting/accounts/controllers/**',
            '**/accounting/accounts/dto',
            '**/accounting/accounts/dto/**',
            '**/accounting/accounts/events',
            '**/accounting/accounts/events/**',
        ],
        message:
            'Import GL account-resolution / journal-posting internals only via the ' +
            'accounting/posting barrel (AccountingPostingFacade + PostingIntent types). ' +
            'accounting/accounts/services (JournalPostingService, OpeningBalancesService, ' +
            'AccountsService, ...) is GL-internal as of Phase 1.',
    },
};

/** One flat-config block per importing domain, restricting every other domain. */
export function domainBoundaryConfigs() {
    return DOMAINS.map((importer) => ({
        files: [`src/modules/${importer}/**/*.ts`],
        ignores: TEST_IGNORES,
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: Object.entries(DOMAIN_RESTRICTIONS)
                        .filter(([domain]) => domain !== importer)
                        .map(([, restriction]) => restriction),
                },
            ],
        },
    }));
}
```

- [ ] **Step 4: Replace the hand-written block in `eslint.config.mjs`**

Add this import directly after `import tseslint from 'typescript-eslint';`:

```js
import { domainBoundaryConfigs } from './eslint/domain-boundaries.mjs';
```

Delete the whole last config object (the one whose comment begins `// Phase 1 boundary (F1):` and which has `files: ['src/modules/**/*.ts']` and `ignores: ['src/modules/accounting/**', ...]`). Put this in its place as the last argument of `tseslint.config(...)`:

```js
  // Domain boundaries (Phase 1 accounting rule, generalized in Phase 5.2) —
  // see eslint/domain-boundaries.mjs for the table and why it is per-importer.
  ...domainBoundaryConfigs(),
```

- [ ] **Step 5: Re-run the proof and the full lint**

Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: `All 9 architecture-rule cases passed.` (identical to Step 2).

Run: `pnpm --filter @devloggers/api lint:ci`
Expected: `0 errors`. The warning count must not change during this task: record it before Step 3 and compare.

- [ ] **Step 6: Add the CI gate**

In `.github/workflows/ci.yml`, directly after the `Lint — apps/api` step, add:

```yaml
      # ── 5.2.3 — prove the boundary / deletion lint rules still fire ─────────
      - name: Architecture lint rules fire
        run: pnpm --filter @devloggers/api lint:architecture
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/eslint/domain-boundaries.mjs apps/api/eslint.config.mjs apps/api/scripts/check-architecture-rules.mjs apps/api/package.json .github/workflows/ci.yml
git commit -m "refactor(api-lint): table-driven domain boundaries with a rule-fires check

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: One public entry point per domain — rules, barrels, fixes, docs (§5.2.1, §5.2.2)

**Files:**
- Modify: `apps/api/eslint/domain-boundaries.mjs`
- Modify: `apps/api/scripts/check-architecture-rules.mjs`
- Create: `apps/api/src/modules/custom-fields/index.ts`
- Create: `apps/api/src/modules/invoicing/index.ts`
- Modify: `apps/api/src/modules/catalog/items/items.module.ts`
- Modify: `apps/api/src/modules/catalog/items/services/items.service.ts`
- Modify: `apps/api/src/modules/catalog/items/services/items-export.service.ts`
- Modify: `apps/api/src/modules/catalog/items/services/items-import.service.ts`
- Modify: `apps/api/src/modules/reports/reports.service.ts`
- Modify: `.ai/rules/api.md`

**Interfaces:**
- Consumes: `DOMAINS`, `DOMAIN_RESTRICTIONS`, `CASES` (Task 6); `modules/inventory` barrel (Task 3).
- Produces: public barrels `modules/custom-fields` (`CustomFieldsModule`, `CustomFieldValuesService`, `CustomFieldsRepository`) and `modules/invoicing` (`computeInvoicePaidState`).

- [ ] **Step 1: Add the failing cases (new rules don't exist yet)**

In `check-architecture-rules.mjs`, add this import below the `node:path` import:

```js
import { DOMAINS, DOMAIN_RESTRICTIONS } from '../eslint/domain-boundaries.mjs';
```

Add these constants below `POSTING_FACADE`:

```js
const ITEMS_SERVICE = 'src/modules/catalog/items/services/items.service.ts';
const REPORTS_SERVICE = 'src/modules/reports/reports.service.ts';
const PARTIES_CONTROLLER = 'src/modules/parties/parties.controller.ts';
const STOCK_COUNTS_SERVICE = 'src/modules/inventory/stock-counts/stock-counts.service.ts';
```

Append to `CASES`:

```js
    // ── Phase 5.2: every domain is reachable only through its public entry point ──
    importCase(INVOICE_POSTING, '../../inventory', 'clean'),
    importCase(INVOICE_POSTING, '../../inventory/inventory.service', 'error'),
    importCase(INVOICE_POSTING, '../../inventory/movements', 'error'),
    importCase(ITEMS_SERVICE, '@/modules/inventory', 'clean'),
    importCase(ITEMS_SERVICE, '@/modules/inventory/movements/stock-movement.writer', 'error'),
    importCase(ITEMS_SERVICE, '@/modules/custom-fields', 'clean'),
    importCase(ITEMS_SERVICE, '@/modules/custom-fields/services/custom-field-values.service', 'error'),
    importCase(REPORTS_SERVICE, '../invoicing', 'clean'),
    importCase(REPORTS_SERVICE, '../invoicing/invoices/presenters/invoice.presenter', 'error'),
    importCase(STOCK_COUNTS_SERVICE, '../../catalog/items/services/items.service', 'error'),
    importCase(STOCK_COUNTS_SERVICE, '../../parties/repositories/parties.repository', 'error'),
    // identity publishes only its auth kernel
    importCase(PARTIES_CONTROLLER, '../identity/auth/guards', 'clean'),
    importCase(PARTIES_CONTROLLER, '../identity/auth/decorators', 'clean'),
    importCase(PARTIES_CONTROLLER, '../identity/auth/auth.module', 'error'),
    importCase(PARTIES_CONTROLLER, '../identity/users/users.service', 'error'),
    // a domain may still deep-import itself
    importCase(STOCK_COUNTS_SERVICE, '../movements/stock-movement.writer', 'clean'),
```

At the start of `main()`, before the loop, add the coverage assertion so a new domain folder can't slip in unrestricted:

```js
    const unrestricted = DOMAINS.filter((domain) => !(domain in DOMAIN_RESTRICTIONS));
    if (unrestricted.length > 0) {
        console.error(`✗ domains with no entry in eslint/domain-boundaries.mjs DOMAIN_RESTRICTIONS: ${unrestricted.join(', ')}`);
        failures++;
    }
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: FAIL. The coverage check lists `ai-chat, audit, catalog, custom-fields, files, identity, inventory, invoicing, parties, reports`. Every new `error` case prints `✗`, and every new `clean` case prints `✓`.

- [ ] **Step 3: Restrict every domain**

In `apps/api/eslint/domain-boundaries.mjs`, add this helper above `DOMAIN_RESTRICTIONS`:

```js
/**
 * The default shape: other domains may import only the domain's barrel
 * (`modules/<domain>`, i.e. its index.ts). Any deeper path is an error.
 * @param {string} domain
 * @param {string} publicApi human description of what the barrel exposes
 */
function barrelOnly(domain, publicApi) {
    return {
        group: [`**/${domain}/*`, `**/${domain}/*/**`],
        message:
            `'${domain}' is a separate domain — import it only via its barrel 'modules/${domain}' ` +
            `(${publicApi}). See .ai/rules/api.md § Domain boundaries.`,
    };
}
```

Then add these entries to `DOMAIN_RESTRICTIONS`, after `accounting`:

```js
    // Shared kernel: every controller needs JwtAuthGuard and @CurrentUser.
    // Everything else in identity (users, tenants, settings, onboarding) is internal.
    identity: {
        group: [
            '**/identity/*',
            '**/identity/*/**',
            '!**/identity/auth',
            '!**/identity/auth/**',
            '**/identity/auth/*',
            '**/identity/auth/*/**',
            '!**/identity/auth/guards',
            '!**/identity/auth/guards/**',
            '!**/identity/auth/decorators',
            '!**/identity/auth/decorators/**',
        ],
        message:
            "Outside identity, import only 'identity/auth/guards' and 'identity/auth/decorators'. " +
            'Users, tenants, settings and onboarding are identity internals. See .ai/rules/api.md § Domain boundaries.',
    },
    inventory: barrelOnly('inventory', 'InventoryModule, InventoryService, InventoryMovementFacade + MovementIntent types'),
    invoicing: barrelOnly('invoicing', 'computeInvoicePaidState'),
    'custom-fields': barrelOnly('custom-fields', 'CustomFieldsModule, CustomFieldValuesService, CustomFieldsRepository'),
    catalog: barrelOnly('catalog', 'nothing yet — add an index.ts before depending on catalog'),
    parties: barrelOnly('parties', 'nothing yet — add an index.ts before depending on parties'),
    reports: barrelOnly('reports', 'nothing yet — reports is a leaf'),
    files: barrelOnly('files', 'nothing yet — add an index.ts before depending on files'),
    audit: barrelOnly('audit', 'nothing yet — add an index.ts before depending on audit'),
    'ai-chat': barrelOnly('ai-chat', 'nothing yet — ai-chat is a leaf'),
```

- [ ] **Step 4: Run lint and confirm exactly the six known violations**

Run: `pnpm --filter @devloggers/api exec eslint "src/modules/**/*.ts" --format unix | grep no-restricted-imports`
Expected: exactly these 6 lines (line/column may differ):

```
src/modules/catalog/items/items.module.ts:2:…  '@/modules/custom-fields/custom-fields.module' …
src/modules/catalog/items/services/items.service.ts:7:…  '@/modules/custom-fields/services/custom-field-values.service' …
src/modules/catalog/items/services/items-export.service.ts:12:…  '@/modules/custom-fields/repositories/custom-fields.repository' …
src/modules/catalog/items/services/items-export.service.ts:13:…  '@/modules/custom-fields/services/custom-field-values.service' …
src/modules/catalog/items/services/items-import.service.ts:12:…  '@/modules/custom-fields/repositories/custom-fields.repository' …
src/modules/reports/reports.service.ts:3:…  '../invoicing/invoices/presenters/invoice.presenter' …
```

If **any other** line appears, stop. It is either a real cross-domain dependency Task 0 missed, which you should report, or a glob false positive, which means fixing the table rather than the importing file.

- [ ] **Step 5: Create the two barrels**

```ts
// apps/api/src/modules/custom-fields/index.ts
/**
 * Public API of the custom-fields domain. Other domains import from
 * 'modules/custom-fields' only (Phase 5.2). Files inside custom-fields must
 * not import this barrel.
 *
 * Known debt: CustomFieldsRepository is exported because catalog's item
 * import/export reads field definitions with findByModule. A read method on
 * CustomFieldsService would be the cleaner public surface.
 */
export { CustomFieldsModule } from './custom-fields.module';
export { CustomFieldValuesService } from './services/custom-field-values.service';
export { CustomFieldsRepository } from './repositories/custom-fields.repository';
```

```ts
// apps/api/src/modules/invoicing/index.ts
/**
 * Public API of the invoicing domain. Other domains import from
 * 'modules/invoicing' only (Phase 5.2). Files inside invoicing must not
 * import this barrel.
 */
export { computeInvoicePaidState } from './invoices/presenters/invoice.presenter';
```

- [ ] **Step 6: Point the six imports at the barrels**

`apps/api/src/modules/catalog/items/items.module.ts`: replace

```ts
import { CustomFieldsModule } from '@/modules/custom-fields/custom-fields.module';
```
with
```ts
import { CustomFieldsModule } from '@/modules/custom-fields';
```

`apps/api/src/modules/catalog/items/services/items.service.ts`: replace

```ts
import { CustomFieldValuesService } from '@/modules/custom-fields/services/custom-field-values.service';
```
with
```ts
import { CustomFieldValuesService } from '@/modules/custom-fields';
```

`apps/api/src/modules/catalog/items/services/items-export.service.ts`: replace the two lines

```ts
import { CustomFieldsRepository } from '@/modules/custom-fields/repositories/custom-fields.repository';
import { CustomFieldValuesService } from '@/modules/custom-fields/services/custom-field-values.service';
```
with
```ts
import { CustomFieldsRepository, CustomFieldValuesService } from '@/modules/custom-fields';
```

`apps/api/src/modules/catalog/items/services/items-import.service.ts`: replace

```ts
import { CustomFieldsRepository } from '@/modules/custom-fields/repositories/custom-fields.repository';
```
with
```ts
import { CustomFieldsRepository } from '@/modules/custom-fields';
```

`apps/api/src/modules/reports/reports.service.ts`: replace

```ts
import { computeInvoicePaidState } from '../invoicing/invoices/presenters/invoice.presenter';
```
with
```ts
import { computeInvoicePaidState } from '../invoicing';
```

- [ ] **Step 7: Verify rules, lint, types, tests and DI**

Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: `All 25 architecture-rule cases passed.`

Run: `pnpm --filter @devloggers/api lint:ci`
Expected: `0 errors`.

Run: `pnpm --filter @devloggers/api typecheck && pnpm --filter @devloggers/api test`
Expected: exit 0; 21 suites / 101 tests.

Run: `git diff apps/api/openapi.yaml | sha1sum`, then `pnpm generate`, then `git diff apps/api/openapi.yaml | sha1sum`
Expected: `pnpm generate` exits 0 (no barrel-induced import cycle breaks Nest bootstrap), hashes identical.

- [ ] **Step 8: Document the dependency graph (§5.2.2)**

In `.ai/rules/api.md`, insert this section directly before `## Reference`:

````markdown
## Domain boundaries (lint-enforced)

Each directory under `apps/api/src/modules/` is a domain. **Outside a domain, import only its public entry point.** Deep imports are `no-restricted-imports` errors, configured in `apps/api/eslint/domain-boundaries.mjs` and proven by `pnpm --filter @devloggers/api lint:architecture` (CI). Inside a domain, use relative imports and never import your own barrel (that creates module cycles).

| Domain | Public entry point(s) | Exposes |
|---|---|---|
| `accounting` | `accounting/posting`, `accounting/document-sequences`, `accounting/financial-settings`, `accounting/fiscal-periods`, `accounting/accounts/utils` | `AccountingPostingFacade` + `PostingIntent` types; numbering; tenant setup config; period/slot guards |
| `identity` | `identity/auth/guards`, `identity/auth/decorators` | `JwtAuthGuard`, `@CurrentUser` (shared kernel) |
| `inventory` | `inventory` | `InventoryModule`, `InventoryService`, `InventoryMovementFacade` + `MovementIntent` types |
| `invoicing` | `invoicing` | `computeInvoicePaidState` |
| `custom-fields` | `custom-fields` | `CustomFieldsModule`, `CustomFieldValuesService`, `CustomFieldsRepository` |
| `catalog`, `parties`, `reports`, `files`, `audit`, `ai-chat` | — (no consumers yet) | add an `index.ts` before another domain depends on it |

Allowed dependency graph (besides every domain → `identity` auth kernel):

```
invoicing ─┬─► accounting (posting, document-sequences, accounts/utils)
           └─► inventory
inventory ───► accounting (posting, document-sequences, accounts/utils)
catalog   ─┬─► inventory
           └─► custom-fields
identity  ───► accounting (document-sequences, financial-settings, fiscal-periods)   # onboarding
reports   ───► invoicing
```

`src/app.module.ts` is the composition root and is exempt. **Adding an edge** means: export the symbol from the target's `index.ts`, add it to the table above, and add a probe case to `apps/api/scripts/check-architecture-rules.mjs`. **Adding a domain** folder fails `lint:architecture` until it has a `DOMAIN_RESTRICTIONS` entry.
````

- [ ] **Step 9: Commit**

```bash
git add apps/api/eslint/domain-boundaries.mjs apps/api/scripts/check-architecture-rules.mjs apps/api/src/modules/custom-fields/index.ts apps/api/src/modules/invoicing/index.ts apps/api/src/modules/catalog/items apps/api/src/modules/reports/reports.service.ts .ai/rules/api.md
git commit -m "feat(api-lint): enforce one public entry point per domain

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Part C — Deletion semantics (spec §5.3, F8)

### Task 8: Pin the existing financial-document delete guards (§5.3.2, §5.3.3)

Task 0 showed that the guards already exist but nothing tests them. These are **pinning** tests, so they pass on first run. That is expected: the spec's "Done when: posted payment delete returns 400/403, not 200" needs *proof*, not new code. Each test is then checked for real teeth by breaking the guard temporarily (Step 4).

**Files:**
- Test: `apps/api/src/modules/invoicing/payments/payments.delete-http.spec.ts`
- Test: `apps/api/src/modules/invoicing/expenses/expenses.delete-guard.spec.ts`
- Test: `apps/api/src/modules/invoicing/invoices/invoices.delete-guard.spec.ts`

**Interfaces:**
- Consumes: `PaymentsController`, `PaymentsService`, `ExpensesService.remove`, `InvoicesService.delete` as they exist today.
- Produces: nothing new. Later tasks must keep these green.

- [ ] **Step 1: HTTP-level test for payments (single and bulk delete)**

```ts
// apps/api/src/modules/invoicing/payments/payments.delete-http.spec.ts
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../identity/auth/guards';

/**
 * Phase 5.3 — a posted payment is cancel-only. Exercises the real controller
 * and the real StatusGuardedCrudService delete path over HTTP; only the
 * repository and the auth guard are doubles.
 */
describe('DELETE /payments — posted payments cannot be deleted', () => {
    let app: INestApplication;
    const repository = { findByIdOrFail: jest.fn(), delete: jest.fn() };

    beforeEach(async () => {
        repository.findByIdOrFail.mockReset();
        repository.delete.mockReset().mockResolvedValue({});
        const service = new PaymentsService(repository as any, {} as any, {} as any, {} as any, {} as any);

        const moduleRef = await Test.createTestingModule({
            controllers: [PaymentsController],
            providers: [{ provide: PaymentsService, useValue: service }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (ctx: ExecutionContext) => {
                    ctx.switchToHttp().getRequest<{ user?: unknown }>().user = { id: 'u1', tenantId: 't1', email: 'u1@example.test' };
                    return true;
                },
            })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('returns 400 and deletes nothing for a POSTED payment', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'p1', tenantId: 't1', status: 'POSTED' });

        await request(app.getHttpServer()).delete('/payments/p1').expect(400);

        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('returns 400 and deletes nothing for a CANCELLED payment', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'p1', tenantId: 't1', status: 'CANCELLED' });

        await request(app.getHttpServer()).delete('/payments/p1').expect(400);

        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes a DRAFT payment with 204', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'p1', tenantId: 't1', status: 'DRAFT' });

        await request(app.getHttpServer()).delete('/payments/p1').expect(204);

        expect(repository.delete).toHaveBeenCalledWith('p1');
    });

    it('bulk delete reports a POSTED payment as failed and deletes nothing', async () => {
        repository.findByIdOrFail.mockResolvedValue({ id: 'p1', tenantId: 't1', status: 'POSTED' });

        const res = await request(app.getHttpServer()).delete('/payments').send({ ids: ['p1'] }).expect(200);

        expect(res.body.data).toEqual(expect.objectContaining({ total: 1, succeeded: 0, failed: 1 }));
        expect(repository.delete).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Service-level tests for expenses and invoices**

```ts
// apps/api/src/modules/invoicing/expenses/expenses.delete-guard.spec.ts
import { BadRequestException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';

/** Phase 5.3 — only DRAFT expenses can be deleted; posted ones are cancelled. */
function build(status: string) {
    const prisma = { expense: { delete: jest.fn().mockResolvedValue({}) } };
    const svc = new ExpensesService(prisma as any, {} as any, {} as any);
    jest.spyOn(svc, 'findById').mockResolvedValue({ id: 'e1', status } as any);
    return { svc, prisma };
}

describe('ExpensesService.remove — deletion guard', () => {
    it.each(['POSTED', 'CANCELLED'])('refuses to delete a %s expense', async (status) => {
        const { svc, prisma } = build(status);

        await expect(svc.remove('t1', 'e1')).rejects.toThrow(BadRequestException);
        expect(prisma.expense.delete).not.toHaveBeenCalled();
    });

    it('deletes a DRAFT expense', async () => {
        const { svc, prisma } = build('DRAFT');

        await svc.remove('t1', 'e1');

        expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });
});
```

```ts
// apps/api/src/modules/invoicing/invoices/invoices.delete-guard.spec.ts
import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

/**
 * Phase 5.3 — only DRAFT invoices can be deleted (and no HTTP route exposes
 * even that); posted invoices are cancelled via InvoicePostingService.
 */
function build(status: string) {
    const tx = {
        tagAssignment: { deleteMany: jest.fn() },
        customFieldValue: { deleteMany: jest.fn() },
        invoiceLine: { deleteMany: jest.fn() },
        invoice: { delete: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)) };
    const svc = new InvoicesService(prisma as any, {} as any, {} as any, {} as any);
    jest.spyOn(svc, 'findById').mockResolvedValue({ id: 'inv-1', status } as any);
    return { svc, prisma, tx };
}

describe('InvoicesService.delete — deletion guard', () => {
    it.each(['POSTED', 'CANCELLED'])('refuses to delete a %s invoice', async (status) => {
        const { svc, prisma } = build(status);

        await expect(svc.delete('t1', 'inv-1')).rejects.toThrow(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deletes a DRAFT invoice with its lines', async () => {
        const { svc, tx } = build('DRAFT');

        await svc.delete('t1', 'inv-1');

        expect(tx.invoiceLine.deleteMany).toHaveBeenCalledWith({ where: { invoiceId: 'inv-1' } });
        expect(tx.invoice.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    });
});
```

- [ ] **Step 3: Run them**

Run: `pnpm --filter @devloggers/api test -- payments.delete-http expenses.delete-guard invoices.delete-guard`
Expected: PASS: payments 4, expenses 3, invoices 3.

If the payments HTTP test fails on bootstrap (for example a guard or pipe dependency the testing module cannot resolve), fix the **test module setup** by overriding or providing that dependency. Do not change `PaymentsController`.

- [ ] **Step 4: Prove each suite has teeth (temporary, not committed)**

1. In `packages/backend-core/src/base/status-guarded-crud-service.ts`, make `beforeDelete` return immediately. Run `pnpm --filter @devloggers/backend-core build && pnpm --filter @devloggers/api test -- payments.delete-http`. Expected: the POSTED/CANCELLED and bulk tests FAIL. Revert and rebuild backend-core.
2. In `expenses.service.ts` `remove`, comment out the status check. Run the expenses spec → the refusal tests FAIL. Revert.
3. In `invoices.service.ts` `delete`, comment out the status check. Run the invoices spec → the refusal tests FAIL. Revert.

Run: `git status --short packages/backend-core apps/api/src/modules/invoicing/expenses/expenses.service.ts apps/api/src/modules/invoicing/invoices/invoices.service.ts`
Expected: no output (everything reverted).

- [ ] **Step 5: Full suite**

Run: `pnpm --filter @devloggers/api test`
Expected: 24 suites / 111 tests (21/101 + 3 suites, 10 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/invoicing/payments/payments.delete-http.spec.ts apps/api/src/modules/invoicing/expenses/expenses.delete-guard.spec.ts apps/api/src/modules/invoicing/invoices/invoices.delete-guard.spec.ts
git commit -m "test(invoicing): pin cancel-only deletion for posted payments, expenses, invoices

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: `StatusGuardedCrudRepository` — repository backstop (§5.3.4, part 1)

The service guard gives the user a 400. This backstop covers any future code path that calls `repository.delete(id)` directly and skips the service. It re-reads the row's status right before the hard delete and refuses with **409** (`ConflictException`), the same status `mapPrismaError` already uses in this repository for integrity refusals.

**Files:**
- Modify: `packages/backend-core/src/base/crud-repository.ts`
- Create: `packages/backend-core/src/base/status-guarded-crud-repository.ts`
- Test: `packages/backend-core/src/base/status-guarded-crud-repository.spec.ts`
- Modify: `packages/backend-core/src/base/index.ts`
- Modify: `apps/api/src/modules/invoicing/payments/repositories/payments.repository.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces:
  - `CrudRepository.beforeHardDelete(id: string): Promise<void>` (protected hook, no-op by default, awaited at the start of `delete`)
  - `abstract class StatusGuardedCrudRepository<T extends TenantEntity & { status: string }> extends CrudRepository<T>` with `protected readonly deletableStatuses: readonly string[] = ['DRAFT']`
  - `PaymentsRepository extends StatusGuardedCrudRepository<Payment>`

- [ ] **Step 1: Write the failing spec**

```ts
// packages/backend-core/src/base/status-guarded-crud-repository.spec.ts
import { ConflictException } from '@nestjs/common';
import { StatusGuardedCrudRepository } from './status-guarded-crud-repository';
import { CrudRepository, TenantEntity } from './crud-repository';

interface Doc extends TenantEntity {
  status: string;
}

class DocRepository extends StatusGuardedCrudRepository<Doc> {}
class PlainRepository extends CrudRepository<Doc> {}

function model(row: { status: string } | null) {
  return {
    findUnique: jest.fn().mockResolvedValue(row),
    delete: jest.fn().mockResolvedValue({ id: 'd1' }),
  };
}

describe('StatusGuardedCrudRepository', () => {
  it.each(['POSTED', 'CANCELLED'])('refuses to hard-delete a %s row with 409', async (status) => {
    const m = model({ status });

    await expect(new DocRepository(m).delete('d1')).rejects.toThrow(ConflictException);
    expect(m.delete).not.toHaveBeenCalled();
  });

  it('hard-deletes a DRAFT row', async () => {
    const m = model({ status: 'DRAFT' });

    await new DocRepository(m).delete('d1');

    expect(m.findUnique).toHaveBeenCalledWith({ where: { id: 'd1' }, select: { status: true } });
    expect(m.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });

  it('lets a missing row fall through to the delete, preserving its not-found error', async () => {
    const m = model(null);

    await new DocRepository(m).delete('d1');

    expect(m.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });

  it('leaves plain CrudRepository deletes unchanged (no status read)', async () => {
    const m = model({ status: 'POSTED' });

    await new PlainRepository(m).delete('d1');

    expect(m.findUnique).not.toHaveBeenCalled();
    expect(m.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @devloggers/backend-core test -- status-guarded-crud-repository`
Expected: FAIL — `Cannot find module './status-guarded-crud-repository'`.

- [ ] **Step 3: Add the hook to `CrudRepository.delete`**

In `packages/backend-core/src/base/crud-repository.ts`, replace the `delete` method:

```ts
  /**
   * Hard-delete a record by id.
   */
  async delete(id: string): Promise<T> {
    try {
      return await this.model.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }
```

with:

```ts
  /**
   * Hard-delete a record by id. Runs {@link beforeHardDelete} first.
   */
  async delete(id: string): Promise<T> {
    await this.beforeHardDelete(id);
    try {
      return await this.model.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  /**
   * Last-line refusal hook for hard deletes, independent of any service guard.
   * No-op by default; see StatusGuardedCrudRepository.
   */
  protected async beforeHardDelete(_id: string): Promise<void> {}
```

- [ ] **Step 4: Write the backstop class and export it**

```ts
// packages/backend-core/src/base/status-guarded-crud-repository.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { CrudRepository, TenantEntity } from './crud-repository';

/**
 * Repository backstop for status-lifecycle documents (Phase 5.3.4).
 *
 * StatusGuardedCrudService already rejects deleting a non-DRAFT document with
 * a 400. This guard sits underneath it, so code that calls repository.delete()
 * directly still cannot hard-delete a posted or cancelled document: financial
 * documents are cancelled or reversed, never deleted. It answers 409, the same
 * status mapPrismaError uses for integrity refusals.
 *
 * A missing row is not refused here: the delete proceeds so Prisma's own
 * not-found error surfaces exactly as before.
 */
@Injectable()
export abstract class StatusGuardedCrudRepository<T extends TenantEntity & { status: string }> extends CrudRepository<T> {
  protected readonly deletableStatuses: readonly string[] = ['DRAFT'];

  protected override async beforeHardDelete(id: string): Promise<void> {
    const row: { status: string } | null = await this.model.findUnique({ where: { id }, select: { status: true } });
    if (row && !this.deletableStatuses.includes(row.status)) {
      throw new ConflictException(
        `Refusing to hard-delete a ${row.status} record: financial documents are cancelled or reversed, never deleted.`,
      );
    }
  }
}
```

In `packages/backend-core/src/base/index.ts`, add after `export * from './status-guarded-crud-service';`:

```ts
export * from './status-guarded-crud-repository';
```

- [ ] **Step 5: Run the backend-core suite**

Run: `pnpm --filter @devloggers/backend-core test`
Expected: PASS: 2 suites, 11 tests (existing 6 + new 5).

Run: `pnpm --filter @devloggers/backend-core build`
Expected: exit 0.

- [ ] **Step 6: Put payments behind the backstop**

In `apps/api/src/modules/invoicing/payments/repositories/payments.repository.ts`, replace

```ts
import { CrudRepository } from '@devloggers/backend-core';
import type { Payment } from '@devloggers/db-prisma';

@Injectable()
export class PaymentsRepository extends CrudRepository<Payment> {
```

with

```ts
import { StatusGuardedCrudRepository } from '@devloggers/backend-core';
import type { Payment } from '@devloggers/db-prisma';

@Injectable()
export class PaymentsRepository extends StatusGuardedCrudRepository<Payment> {
```

- [ ] **Step 7: Verify the API**

Run: `pnpm --filter @devloggers/api typecheck && pnpm --filter @devloggers/api test`
Expected: exit 0; 24 suites / 111 tests (the Task 8 HTTP test mocks the whole repository, so it is unaffected).

- [ ] **Step 8: Run backend-core tests in CI**

In `.github/workflows/ci.yml`, directly after the `Test — apps/api` step, add:

```yaml
      - name: Test — backend-core
        run: pnpm --filter @devloggers/backend-core test
```

- [ ] **Step 9: Commit**

```bash
git add packages/backend-core/src/base apps/api/src/modules/invoicing/payments/repositories/payments.repository.ts .github/workflows/ci.yml
git commit -m "feat(backend-core): StatusGuardedCrudRepository refuses hard-deleting posted documents

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Lint-ban raw Prisma deletes on financial models (§5.3.4, part 2)

Only payments go through a repository. Invoices, expenses and opening-balance sessions call Prisma directly, and a new service could too. This rule makes any `x.<financialModel>.delete(…)` / `.deleteMany(…)` a lint error, with a short, reviewed allowlist in config. Inline `eslint-disable` is banned under `src/modules` by CI.

**Files:**
- Modify: `apps/api/eslint.config.mjs`
- Modify: `apps/api/scripts/check-architecture-rules.mjs`

**Interfaces:**
- Consumes: `CASES` / `main()` from Task 6.
- Produces: `no-restricted-syntax` error on raw deletes of `invoice`, `payment`, `expense`, `journalEntry`, `journalLine`, `stockMovement`, `stockCount`, `openingBalanceSession`.

- [ ] **Step 1: Add the failing cases**

In `check-architecture-rules.mjs`, add this helper below `importCase`:

```js
/**
 * @param {string} file
 * @param {string} call e.g. 'tx.payment.delete'
 * @param {'error' | 'clean'} expect
 * @returns {Case}
 */
function deleteCase(file, call, expect) {
    return {
        name: `${file} calls ${call}(...)`,
        file,
        code: `export async function probe(tx: any): Promise<void> {\n    await ${call}({ where: { id: 'x' } });\n}\n`,
        rule: 'no-restricted-syntax',
        expect,
    };
}
```

Add these constants below the others:

```js
const PAYMENTS_SERVICE = 'src/modules/invoicing/payments/payments.service.ts';
const EXPENSES_SERVICE = 'src/modules/invoicing/expenses/expenses.service.ts';
const DATA_RESET_SERVICE = 'src/modules/identity/settings/services/data-reset.service.ts';
```

Append to `CASES`:

```js
    // ── Phase 5.3.4: financial documents are never hard-deleted outside the allowlist ──
    deleteCase(PAYMENTS_SERVICE, 'tx.payment.delete', 'error'),
    deleteCase(PAYMENTS_SERVICE, 'this.prisma.journalEntry.deleteMany', 'error'),
    deleteCase(STOCK_COUNTS_SERVICE, 'tx.stockMovement.deleteMany', 'error'),
    deleteCase(ITEMS_SERVICE, 'tx.invoice.delete', 'error'),
    deleteCase(PAYMENTS_SERVICE, 'tx.invoiceLine.deleteMany', 'clean'),
    deleteCase(PAYMENTS_SERVICE, 'tx.paymentAllocation.delete', 'clean'),
    // allowlisted: DRAFT-guarded deletes and the phrase-confirmed tenant reset
    deleteCase(EXPENSES_SERVICE, 'this.prisma.expense.delete', 'clean'),
    deleteCase(DATA_RESET_SERVICE, 'tx.journalEntry.deleteMany', 'clean'),
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: FAIL with 4 `✗` lines, the four `error` delete cases. The four `clean` delete cases pass. (If a probe reports a parse error for `tx: any`, that is a real finding. Do not continue until the probe parses.)

- [ ] **Step 3: Add the rule**

In `apps/api/eslint.config.mjs`, add this config object directly **before** `...domainBoundaryConfigs(),`:

```js
  {
    // Phase 5.3.4 — financial documents and ledger rows are cancelled or
    // reversed, never hard-deleted. Allowlist, each reviewed:
    //   invoices.service.ts                — delete(): DRAFT-only, no HTTP route (pinned by invoices.delete-guard.spec.ts)
    //   expenses.service.ts                — remove(): DRAFT-only (pinned by expenses.delete-guard.spec.ts)
    //   opening-balance-sessions.service.ts — remove(): assertMutable, DRAFT-only
    //   data-reset.service.ts              — tenant-wide danger-zone reset, phrase-confirmed
    // Repository-based documents are covered by StatusGuardedCrudRepository instead.
    // See .ai/rules/api.md § Deletion semantics.
    files: ['src/**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.spec-fixtures.ts',
      '**/__tests__/**',
      'src/modules/invoicing/invoices/invoices.service.ts',
      'src/modules/invoicing/expenses/expenses.service.ts',
      'src/modules/accounting/opening-balances/sessions/opening-balance-sessions.service.ts',
      'src/modules/identity/settings/services/data-reset.service.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name=/^(delete|deleteMany)$/]" +
            "[callee.object.type='MemberExpression']" +
            "[callee.object.property.name=/^(invoice|payment|expense|journalEntry|journalLine|stockMovement|stockCount|openingBalanceSession)$/]",
          message:
            'Financial documents and ledger rows are cancelled or reversed, never hard-deleted. ' +
            'Use the document\'s cancel/reverse flow. A DRAFT-only delete must be added to the reviewed ' +
            'allowlist in eslint.config.mjs. See .ai/rules/api.md § Deletion semantics.',
        },
      ],
    },
  },
```

The regex anchors (`^…$`) are what keep `invoiceLine`, `paymentAllocation` and `stockBalance` out of scope.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: `All 33 architecture-rule cases passed.`

Run: `pnpm --filter @devloggers/api lint:ci`
Expected: `0 errors`. A `no-restricted-syntax` error here means a raw financial delete Task 0 did not find: report it, do not allowlist it silently.

- [ ] **Step 5: Commit**

```bash
git add apps/api/eslint.config.mjs apps/api/scripts/check-architecture-rules.mjs
git commit -m "feat(api-lint): forbid raw Prisma deletes of financial documents and ledger rows

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Guard master-data deletes against `ON DELETE SET NULL` ledger detachment + decision table (§5.3.1, §5.3.5)

**The bug (Task 0):** `payments.party_id` and `journal_lines.{party_id, cashbox_id, bank_account_id, currency_id}` are `ON DELETE SET NULL`, and none of the four owning services has a `beforeDelete`. Deleting a referenced party, cashbox, bank account or currency today succeeds and silently strips that dimension from posted ledger rows. The fix refuses the delete with 409 and points the user at `isActive = false`. All four models have it.

**Files:**
- Modify: `apps/api/src/modules/parties/repositories/parties.repository.ts`
- Modify: `apps/api/src/modules/parties/parties.service.ts`
- Test: `apps/api/src/modules/parties/parties.delete-guard.spec.ts`
- Modify: `apps/api/src/modules/invoicing/cashboxes/repositories/cashboxes.repository.ts`
- Modify: `apps/api/src/modules/invoicing/cashboxes/services/cashboxes.service.ts`
- Test: `apps/api/src/modules/invoicing/cashboxes/cashboxes.delete-guard.spec.ts`
- Modify: `apps/api/src/modules/invoicing/bank-accounts/repositories/bank-accounts.repository.ts`
- Modify: `apps/api/src/modules/invoicing/bank-accounts/services/bank-accounts.service.ts`
- Test: `apps/api/src/modules/invoicing/bank-accounts/bank-accounts.delete-guard.spec.ts`
- Modify: `apps/api/src/modules/accounting/currencies/repositories/currencies.repository.ts`
- Modify: `apps/api/src/modules/accounting/currencies/services/currencies.service.ts`
- Test: `apps/api/src/modules/accounting/currencies/currencies.delete-guard.spec.ts`
- Modify: `.ai/rules/api.md`

**Interfaces:**
- Produces: `countLedgerReferences(tenantId: string, id: string): Promise<number>` on `PartiesRepository`, `CashboxesRepository`, `BankAccountsRepository`, `CurrenciesRepository`; a `beforeDelete` override on each matching service.

- [ ] **Step 1: Write the four failing specs**

All four follow one shape. Each is written out in full because an implementer may read tasks out of order.

```ts
// apps/api/src/modules/parties/parties.delete-guard.spec.ts
import { ConflictException } from '@nestjs/common';
import { PartiesService } from './parties.service';

/** Phase 5.3.5 — payments.party_id and journal_lines.party_id are ON DELETE SET NULL. */
function build(ledgerReferences: number) {
    const repository = {
        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'p1', tenantId: 't1' }),
        countLedgerReferences: jest.fn().mockResolvedValue(ledgerReferences),
        delete: jest.fn().mockResolvedValue({}),
    };
    const prisma = { tagAssignment: { deleteMany: jest.fn() }, customFieldValue: { deleteMany: jest.fn() } };
    const svc = new PartiesService(repository as any, {} as any, prisma as any, { emit: jest.fn() } as any);
    return { svc, repository };
}

describe('PartiesService.delete — ledger references', () => {
    it('refuses with 409 when payments or journal lines reference the party', async () => {
        const { svc, repository } = build(2);

        await expect(svc.delete('t1', 'p1')).rejects.toThrow(ConflictException);
        expect(repository.countLedgerReferences).toHaveBeenCalledWith('t1', 'p1');
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced party', async () => {
        const { svc, repository } = build(0);

        await svc.delete('t1', 'p1');

        expect(repository.delete).toHaveBeenCalledWith('p1');
    });
});
```

```ts
// apps/api/src/modules/invoicing/cashboxes/cashboxes.delete-guard.spec.ts
import { ConflictException } from '@nestjs/common';
import { CashboxesService } from './services/cashboxes.service';

/** Phase 5.3.5 — journal_lines.cashbox_id is ON DELETE SET NULL. */
function build(ledgerReferences: number) {
    const repository = {
        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'c1', tenantId: 't1' }),
        countLedgerReferences: jest.fn().mockResolvedValue(ledgerReferences),
        delete: jest.fn().mockResolvedValue({}),
    };
    const svc = new CashboxesService(repository as any, {} as any, { emit: jest.fn() } as any);
    return { svc, repository };
}

describe('CashboxesService.delete — ledger references', () => {
    it('refuses with 409 when journal lines reference the cashbox', async () => {
        const { svc, repository } = build(1);

        await expect(svc.delete('t1', 'c1')).rejects.toThrow(ConflictException);
        expect(repository.countLedgerReferences).toHaveBeenCalledWith('t1', 'c1');
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced cashbox', async () => {
        const { svc, repository } = build(0);

        await svc.delete('t1', 'c1');

        expect(repository.delete).toHaveBeenCalledWith('c1');
    });
});
```

```ts
// apps/api/src/modules/invoicing/bank-accounts/bank-accounts.delete-guard.spec.ts
import { ConflictException } from '@nestjs/common';
import { BankAccountsService } from './services/bank-accounts.service';

/** Phase 5.3.5 — journal_lines.bank_account_id is ON DELETE SET NULL. */
function build(ledgerReferences: number) {
    const repository = {
        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1' }),
        countLedgerReferences: jest.fn().mockResolvedValue(ledgerReferences),
        delete: jest.fn().mockResolvedValue({}),
    };
    const svc = new BankAccountsService(repository as any, {} as any, { emit: jest.fn() } as any);
    return { svc, repository };
}

describe('BankAccountsService.delete — ledger references', () => {
    it('refuses with 409 when journal lines reference the bank account', async () => {
        const { svc, repository } = build(1);

        await expect(svc.delete('t1', 'b1')).rejects.toThrow(ConflictException);
        expect(repository.countLedgerReferences).toHaveBeenCalledWith('t1', 'b1');
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced bank account', async () => {
        const { svc, repository } = build(0);

        await svc.delete('t1', 'b1');

        expect(repository.delete).toHaveBeenCalledWith('b1');
    });
});
```

```ts
// apps/api/src/modules/accounting/currencies/currencies.delete-guard.spec.ts
import { ConflictException } from '@nestjs/common';
import { CurrenciesService } from './services/currencies.service';

/** Phase 5.3.5 — journal_lines.currency_id is ON DELETE SET NULL. */
function build(ledgerReferences: number) {
    const repository = {
        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'cur1', tenantId: 't1' }),
        countLedgerReferences: jest.fn().mockResolvedValue(ledgerReferences),
        delete: jest.fn().mockResolvedValue({}),
    };
    const svc = new CurrenciesService(repository as any, {} as any, { emit: jest.fn() } as any);
    return { svc, repository };
}

describe('CurrenciesService.delete — ledger references', () => {
    it('refuses with 409 when journal lines reference the currency', async () => {
        const { svc, repository } = build(3);

        await expect(svc.delete('t1', 'cur1')).rejects.toThrow(ConflictException);
        expect(repository.countLedgerReferences).toHaveBeenCalledWith('t1', 'cur1');
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced currency', async () => {
        const { svc, repository } = build(0);

        await svc.delete('t1', 'cur1');

        expect(repository.delete).toHaveBeenCalledWith('cur1');
    });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @devloggers/api test -- delete-guard`
Expected: the 4 new "refuses with 409" tests FAIL (`Received promise resolved instead of rejected`). The "deletes an unreferenced …" tests pass. The Task 8 expenses/invoices delete-guard specs still pass.

- [ ] **Step 3: Add `countLedgerReferences` to each repository**

`PartiesRepository` — add as the last method:

```ts
    /**
     * Posted rows whose party FK is ON DELETE SET NULL (payments.party_id,
     * journal_lines.party_id): deleting the party would silently detach them.
     */
    async countLedgerReferences(tenantId: string, id: string): Promise<number> {
        const [payments, journalLines] = await Promise.all([
            this.prisma.payment.count({ where: { tenantId, partyId: id } }),
            this.prisma.journalLine.count({ where: { tenantId, partyId: id } }),
        ]);
        return payments + journalLines;
    }
```

`CashboxesRepository`, add as the last method. Payments and expenses already block the delete through `RESTRICT` FKs, so only journal lines need counting:

```ts
    /** journal_lines.cashbox_id is ON DELETE SET NULL: deleting the cashbox would silently detach them. */
    async countLedgerReferences(tenantId: string, id: string): Promise<number> {
        return this.prisma.journalLine.count({ where: { tenantId, cashboxId: id } });
    }
```

`BankAccountsRepository` — add as the last method:

```ts
    /** journal_lines.bank_account_id is ON DELETE SET NULL: deleting the bank account would silently detach them. */
    async countLedgerReferences(tenantId: string, id: string): Promise<number> {
        return this.prisma.journalLine.count({ where: { tenantId, bankAccountId: id } });
    }
```

`CurrenciesRepository` — add as the last method:

```ts
    /** journal_lines.currency_id is ON DELETE SET NULL: deleting the currency would silently detach them. */
    async countLedgerReferences(tenantId: string, id: string): Promise<number> {
        return this.prisma.journalLine.count({ where: { tenantId, currencyId: id } });
    }
```

- [ ] **Step 4: Add `beforeDelete` to each service**

`PartiesService`, add directly before `onDeleted` (`ConflictException` is already imported):

```ts
    protected override async beforeDelete(tenantId: string, id: string): Promise<void> {
        if ((await this.partiesRepository.countLedgerReferences(tenantId, id)) > 0) {
            throw new ConflictException(
                'Cannot delete a party that has payments or journal entries. Deactivate it instead.',
            );
        }
    }
```

`CashboxesService`, add after `beforeCreate` (`ConflictException` is already imported):

```ts
    protected override async beforeDelete(tenantId: string, id: string): Promise<void> {
        if ((await this.cashboxesRepository.countLedgerReferences(tenantId, id)) > 0) {
            throw new ConflictException(
                'Cannot delete a cashbox that has journal entries. Deactivate it instead.',
            );
        }
    }
```

`BankAccountsService`, add after `beforeUpdate` (`ConflictException` is already imported):

```ts
    protected override async beforeDelete(tenantId: string, id: string): Promise<void> {
        if ((await this.bankAccountsRepository.countLedgerReferences(tenantId, id)) > 0) {
            throw new ConflictException(
                'Cannot delete a bank account that has journal entries. Deactivate it instead.',
            );
        }
    }
```

`CurrenciesService`, add after `beforeUpdate` (`ConflictException` is already imported):

```ts
    protected override async beforeDelete(tenantId: string, id: string): Promise<void> {
        if ((await this.currenciesRepository.countLedgerReferences(tenantId, id)) > 0) {
            throw new ConflictException(
                'Cannot delete a currency that has journal entries. Deactivate it instead.',
            );
        }
    }
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter @devloggers/api test -- delete-guard`
Expected: PASS — all delete-guard specs.

Run: `pnpm --filter @devloggers/api typecheck && pnpm --filter @devloggers/api test && pnpm --filter @devloggers/api lint:ci`
Expected: exit 0; 28 suites / 119 tests; `0 errors`.

Bulk delete (`DELETE /parties`, etc.) goes through `CrudService.bulkDelete` → `delete()` per id, so the same guard covers it without extra code.

- [ ] **Step 6: Write the deletion decision table (§5.3.1)**

In `.ai/rules/api.md`, insert this section directly before `## Reference` (after the Task 7 `## Domain boundaries` section):

```markdown
## Deletion semantics (per model)

Rule: **financial documents and ledger rows are cancelled or reversed, never hard-deleted** (`.ai/rules/domain.md`). Enforced by service status guards (400), `StatusGuardedCrudRepository` (409 backstop), a `no-restricted-syntax` lint rule on raw Prisma deletes (reviewed allowlist in `apps/api/eslint.config.mjs`), and pinned by `*.delete-guard.spec.ts` / `payments.delete-http.spec.ts`.

| Model | Policy | How |
|---|---|---|
| `Invoice` | cancel-only once POSTED; DRAFT deletable in service, **no HTTP route** | `POST /invoices/:id/cancel` reverses JE + stock |
| `Payment` | cancel-only once POSTED; DRAFT hard delete (`DELETE /payments/:id`, bulk) | `POST /payments/:id/cancel`; `StatusGuardedCrudService` + `StatusGuardedCrudRepository` |
| `Expense` | cancel-only once POSTED; DRAFT hard delete (`DELETE /expenses/:id`) | `POST /expenses/:id/cancel` reverses JE |
| `JournalEntry`, `JournalLine` | never deleted | reversal entry via `AccountingPostingFacade.reverse` |
| `StockMovement` | never deleted | compensating movement via `InventoryMovementFacade` |
| `StockCount` | never deleted (no route); DRAFT stays draft | — |
| `OpeningBalanceSession` | DRAFT hard delete; later statuses immutable | `assertMutable` |
| `PaymentAllocation` | hard delete (link row, no GL effect) | `POST /payments/:id/allocations/:allocationId/remove` |
| `ChartOfAccount` | **soft delete** (archive via `deletedAt`), refused if journal lines exist | `AccountsService.delete` |
| `Party`, `Cashbox`, `BankAccount`, `Currency` | hard delete **only if no ledger rows reference it**, else 409 → set `isActive = false` | `beforeDelete` + `countLedgerReferences` — their ledger FKs are `ON DELETE SET NULL` |
| Other master data (units, brands, items, warehouses, categories, tags, invoice types, …) | hard delete; FK `RESTRICT` violations map to 409 | `CrudRepository` + `mapPrismaError` — not audited row-by-row in Phase 5 |
| Whole tenant | danger-zone reset of all transactional data | `DataResetService`, phrase-confirmed |

Adding a deletable financial model: extend `StatusGuardedCrudRepository`, or add the delete site to the lint allowlist **with** a pinning test. Known debt: flip the `SET NULL` ledger FKs to `RESTRICT` in a migration.
```

The routes in this table were verified against the controllers on 2026-09-17. If one has since moved, correct the table to match the controller, not the other way round.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/parties apps/api/src/modules/invoicing/cashboxes apps/api/src/modules/invoicing/bank-accounts apps/api/src/modules/accounting/currencies .ai/rules/api.md
git commit -m "fix(api): refuse deleting master data that posted ledger rows reference

payments.party_id and journal_lines.{party,cashbox,bank_account,currency}_id
are ON DELETE SET NULL, so these deletes silently stripped dimensions from
posted ledger rows. Also documents the per-model deletion policy.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Part D — Split oversized services (spec §5.4)

### Task 12: Extract invoice line pricing from `invoices.service.ts` (§5.4.1)

`invoices.service.ts` is 401 LOC. The clearest responsibility seam is the line-pricing math, duplicated verbatim in `create()` and `update()` (about 25 lines each, plus the `computeLineTotals` helper). Extracting it into one pure function removes the duplication, so the two paths cannot drift, and makes the math unit-testable. Arithmetic, operation order and defaults are moved unchanged. Per §5.4.3, nothing else is split just to hit a line count.

**Files:**
- Create: `apps/api/src/modules/invoicing/invoices/invoice-totals.ts`
- Test: `apps/api/src/modules/invoicing/invoices/invoice-totals.spec.ts`
- Modify: `apps/api/src/modules/invoicing/invoices/invoices.service.ts`

**Interfaces:**
- Produces: `computeInvoiceTotals(tenantId: string, lines: InvoiceLineDto[])` → `{ lines: <InvoiceLine create rows>[]; subtotal: number; discountAmount: number; taxAmount: number; total: number }`.

- [ ] **Step 1: Write the failing spec**

```ts
// apps/api/src/modules/invoicing/invoices/invoice-totals.spec.ts
import { computeInvoiceTotals } from './invoice-totals';

describe('computeInvoiceTotals', () => {
    const lines = [
        { itemId: 'i1', unitId: 'u1', quantity: 3, unitPrice: 10, discountPercent: 10, taxPercent: 5, notes: 'n', sortOrder: 7 },
        { itemId: 'i2', unitId: 'u1', quantity: 1, unitPrice: 20 },
    ];

    it('applies discount before tax per line and sums document totals', () => {
        const result = computeInvoiceTotals('t1', lines);

        // line 1: 30 − 3 discount = 27, + 1.35 tax = 28.35; line 2: 20
        expect(result.lines[0].discountAmount).toBeCloseTo(3, 10);
        expect(result.lines[0].taxAmount).toBeCloseTo(1.35, 10);
        expect(result.lines[0].total).toBeCloseTo(28.35, 10);
        expect(result.lines[1].total).toBe(20);
        expect(result.subtotal).toBe(50);
        expect(result.discountAmount).toBeCloseTo(3, 10);
        expect(result.taxAmount).toBeCloseTo(1.35, 10);
        expect(result.total).toBe(result.subtotal - result.discountAmount + result.taxAmount);
    });

    it('builds line rows with tenant, defaults and sort order', () => {
        const result = computeInvoiceTotals('t1', lines);

        expect(result.lines[0]).toEqual(expect.objectContaining({
            tenantId: 't1', itemId: 'i1', unitId: 'u1', quantity: 3, unitPrice: 10,
            discountPercent: 10, taxPercent: 5, notes: 'n', sortOrder: 7,
        }));
        expect(result.lines[1]).toEqual(expect.objectContaining({
            tenantId: 't1', itemId: 'i2', discountPercent: 0, taxPercent: 0, discountAmount: 0, taxAmount: 0, sortOrder: 1,
        }));
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @devloggers/api test -- invoice-totals`
Expected: FAIL — `Cannot find module './invoice-totals'`.

- [ ] **Step 3: Write the function**

```ts
// apps/api/src/modules/invoicing/invoices/invoice-totals.ts
import type { InvoiceLineDto } from './dto';

/**
 * Server-side invoice pricing: per line, discount then tax on the discounted
 * amount; document totals are the sums. Shared by InvoicesService.create and
 * .update so the two paths cannot drift (Phase 5.4.1).
 */
export function computeInvoiceTotals(tenantId: string, lines: InvoiceLineDto[]) {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    const lineRows = lines.map((line, index) => {
        const lineSubtotal = line.quantity * line.unitPrice;
        const discountPercent = line.discountPercent || 0;
        const lineDiscount = lineSubtotal * (discountPercent / 100);
        const afterDiscount = lineSubtotal - lineDiscount;
        const taxPercent = line.taxPercent || 0;
        const lineTax = afterDiscount * (taxPercent / 100);

        subtotal += lineSubtotal;
        discountAmount += lineDiscount;
        taxAmount += lineTax;

        return {
            tenantId,
            itemId: line.itemId,
            unitId: line.unitId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent || 0,
            discountAmount: lineDiscount,
            taxPercent: line.taxPercent || 0,
            taxAmount: lineTax,
            total: afterDiscount + lineTax,
            notes: line.notes,
            sortOrder: line.sortOrder ?? index,
        };
    });

    return { lines: lineRows, subtotal, discountAmount, taxAmount, total: subtotal - discountAmount + taxAmount };
}
```

- [ ] **Step 4: Run it**

Run: `pnpm --filter @devloggers/api test -- invoice-totals`
Expected: PASS 2/2.

- [ ] **Step 5: Use it in `InvoicesService`**

In `apps/api/src/modules/invoicing/invoices/invoices.service.ts`:

1. Add after `import { computeInvoicePaidState } from './presenters/invoice.presenter';`:

```ts
import { computeInvoiceTotals } from './invoice-totals';
```

2. Delete the `computeLineTotals` private method and its doc comment (the block starting `/**\n     * Compute line-level totals server-side to ensure accuracy.`). If `InvoiceLineDto` is no longer referenced, remove it from the `./dto` import.

3. In `create()`, replace everything from `// Compute totals` through `const grandTotal = subtotal - totalDiscount + totalTax;` with:

```ts
        const totals = computeInvoiceTotals(tenantId, dto.lines);
```

and in the `this.prisma.invoice.create({ data: { … } })` call replace

```ts
                subtotal,
                discountAmount: totalDiscount,
                taxAmount: totalTax,
                total: grandTotal,
```

with

```ts
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                taxAmount: totals.taxAmount,
                total: totals.total,
```

and

```ts
                lines: {
                    create: processedLines,
                },
```

with

```ts
                lines: {
                    create: totals.lines,
                },
```

4. In `update()`, inside `if (dto.lines && dto.lines.length > 0) {`, keep the `deleteMany` line and replace everything after it up to and including `updateData.lines = { create: processedLines };` with:

```ts
            const totals = computeInvoiceTotals(tenantId, dto.lines);

            updateData.subtotal = totals.subtotal;
            updateData.discountAmount = totals.discountAmount;
            updateData.taxAmount = totals.taxAmount;
            updateData.total = totals.total;
            updateData.lines = { create: totals.lines };
```

- [ ] **Step 6: Verify and measure**

Run: `pnpm --filter @devloggers/api typecheck && pnpm --filter @devloggers/api test && pnpm --filter @devloggers/api lint:ci`
Expected: exit 0; 29 suites / 121 tests; `0 errors`. The Task 8 `invoices.delete-guard.spec.ts` is still green.

Run: `wc -l apps/api/src/modules/invoicing/invoices/invoices.service.ts`
Expected: roughly 345 lines, down from 401. **Record the actual number** in the Task 13 report. If it is still above 350, report it honestly: the remaining candidate seam (invoice↔payment orchestration) is deliberately not split (see Deviation 5).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices/invoice-totals.ts apps/api/src/modules/invoicing/invoices/invoice-totals.spec.ts apps/api/src/modules/invoicing/invoices/invoices.service.ts
git commit -m "refactor(invoicing): extract duplicated invoice line pricing into computeInvoiceTotals

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Final verification + spec status

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-05-domain-coupling.md`

- [ ] **Step 1: Run the spec's verification block plus this plan's gates, fresh**

```bash
pnpm --filter @devloggers/backend-core build
pnpm --filter @devloggers/backend-core test
pnpm turbo run build --filter=@devloggers/api
pnpm --filter @devloggers/api typecheck
pnpm --filter @devloggers/api lint:ci
pnpm --filter @devloggers/api lint:architecture
pnpm --filter @devloggers/api test
pnpm --filter @devloggers/api test -- --testPathPattern=inventory
node scripts/check-eslint-disable.mjs
```

Expected, each cited from its actual output:
- backend-core: 2 suites / 11 tests pass
- api build, typecheck: exit 0
- lint:ci: `0 errors`, warnings ≤ 400 (record the number vs. the 262 baseline)
- lint:architecture: `All 33 architecture-rule cases passed.`
- api tests: 29 suites / 121 tests pass (record actuals if they differ, and explain the difference)
- inventory pattern: characterization, writer and facade suites pass
- eslint-disable gate: exit 0

- [ ] **Step 2: Check "Done when" line by line**

| Spec item | Evidence to cite |
|---|---|
| Invoice post uses `InventoryMovementFacade` only | `git grep -nE "stockBalance\|stockMovement\|postMovementTx\|inventory/inventory\." -- apps/api/src/modules/invoicing ':!*.spec.ts'` → no output |
| Posted payment delete returns 400/403, not 200 | `payments.delete-http.spec.ts` passing (`expect(400)`) |
| No service imports another domain's internals (lint enforced) | `lint:ci` 0 errors + `lint:architecture` import cases |
| Financial documents never hard-deletable via CRUD routes | Task 8 specs + `StatusGuardedCrudRepository` spec + `no-restricted-syntax` cases |
| Per-model delete/archive policy documented and enforced | `.ai/rules/api.md` § Deletion semantics + Task 11 specs |

- [ ] **Step 3: DI / contract smoke**

Run: `git diff apps/api/openapi.yaml | sha1sum`, then `pnpm generate`, then `git diff apps/api/openapi.yaml | sha1sum`
Expected: `pnpm generate` exit 0; identical hashes (Phase 5 changed no routes or DTOs).

- [ ] **Step 4: Update the spec**

In `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-05-domain-coupling.md`:
- change `**Status:** ⬜ not started` to `**Status:** ✅ done (2026-09-…, plan: docs/superpowers/plans/2026-09-17-phase-5-domain-coupling.md)`
- tick every task and success/done checkbox that Step 2 evidenced
- under `## Not in this phase`, add:
  - `Migration flipping journal_lines.{party,cashbox,bank_account,currency}_id and payments.party_id from ON DELETE SET NULL to RESTRICT (app-level guards added in 5.3.5)`
  - `Consolidating accounting's five published entry points into one barrel → Phase 6`
  - `CustomFieldsRepository exposed via the custom-fields barrel — replace with a CustomFieldsService read method`
  - `Re-parenting ExpensesService / InvoicesService / StockCountsService onto StatusGuardedCrudService (guards pinned instead)`

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-20-erp-roadmap/phase-05-domain-coupling.md
git commit -m "docs(roadmap): mark Phase 5 domain coupling done with follow-ups

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
