# Accounting Integration Blueprint — Design

**Date:** 2026-07-02
**Status:** Approved design (pre-implementation)
**Scope:** Wire the remaining ERP document flows into the double-entry GL engine using **perpetual** inventory accounting.

---

## 1. Context & problem

The system already has a working double-entry engine:

- `createPostingJournalEntry(tx, input)` — shared tail: creates a `POSTED` `JournalEntry` + lines, then updates `ChartOfAccount.currentBalance` via `updateAccountBalances`. Runs inside the caller's `$transaction`.
- `buildInvoiceJournalLines` / `buildPaymentJournalLines` / `buildExpenseJournalLines` — pure line builders with a `reverse` flag for cancellations.
- Routing already reads `FinancialSetting` defaults, `party.receivable/payableAccountId` overrides, `cashbox.linkedAccountId`, and sets `partyId` on sub-ledger lines.

**Already correct** (double-entry + reversal-on-cancel): sales invoice *revenue leg*, purchase invoice, payments (receipt/payment), expenses.

**The core gap:** the system runs a **perpetual stock ledger** (`StockBalance` tracks live `quantity` + `averageCost` on every `postMovement`) but a **periodic-style GL**:

- Purchases debit a **Purchase expense** account instead of capitalizing to **Inventory**.
- Sales post no **COGS** leg.
- **Result:** the Inventory asset account (`1130`) is never touched by any journal entry — its GL balance stays `0` forever while real value accrues in `StockBalance`. The books and the warehouse permanently disagree.

Additional untouched flows: **stock-count variance** (posts a `STOCK_COUNT` movement at `unitCost: 0`, zero JE) and **opening balances** (posts an `OPENING` movement, zero JE).

## 2. Decisions

| Decision | Choice |
|---|---|
| Inventory accounting method | **Perpetual** |
| Account routing | **New `FinancialSetting` fields** (tenant-configurable, matches existing default-account pattern) |
| Variance / opening-equity accounts | **Dedicated new seed accounts** |
| Atomicity fix (stock + GL in one tx) | **In scope** |
| Invoice-level discount → inventory cost allocation | **Out of scope — documented follow-up** |

## 3. Scope

Five changes + one documented no-op. No transfer / manual-JE / cashbox-adjustment endpoints exist, so they stay out (YAGNI).

| # | Endpoint | Change |
|---|----------|--------|
| A | `POST /invoices/{id}/post` (PURCHASE) | Capitalize stock lines to **Inventory** instead of Purchase expense |
| B | `POST /invoices/{id}/post` (SALE) | Add **COGS leg** (DR COGS / CR Inventory at `averageCost`) |
| C | `POST /invoices/{id}/cancel` | Reverse the **COGS/Inventory leg** too, at original cost |
| D | `POST /stock-counts/{id}/post` | **New** variance JE + fix `unitCost: 0` → `averageCost` |
| E | `POST /inventory/opening-balances` | **New** opening JE |
| — | `POST /payments/{id}/allocate` | **No JE** — cash & AR already posted at payment-post (documented no-op) |

## 4. Schema & seed changes

Requires **one Prisma migration**, deferred until the shared-DB advisory lock clears (same constraint as the tenant-settings and expenses branches). Code can be written ahead of the migration; `financialSettingsService.getOrThrow` already blocks posting until the new accounts are configured, so partial rollout is safe.

### 4.1 New seed accounts (`packages/db-prisma/src/seed/seeds/chart-of-accounts.seed.ts`)

| Code | Name (en / ar) | Type | Parent |
|------|----------------|------|--------|
| `5200` | Inventory Adjustment / Shrinkage · تسويات المخزون | `EXPENSE` | `5000` Cost of Sales |
| `3300` | Opening Balance Equity · رأس المال الافتتاحي | `EQUITY` | `3000` Equity |

Add matching `SEED_IDS` entries.

### 4.2 New `FinancialSetting` fields (`financial-setting.prisma`)

Mirror the existing `defaultXxxAccountId` + relation pattern:

| Field | Seeded default |
|---|---|
| `defaultInventoryAccountId` | `1130` Inventory |
| `defaultCogsAccountId` | `5100` Cost of Goods Sold |
| `defaultInventoryAdjustmentAccountId` | `5200` Inventory Adjustment |
| `defaultOpeningEquityAccountId` | `3300` Opening Balance Equity |

Each needs a named back-relation on `ChartOfAccount` (as the existing five do). Update the financial-settings DTOs/presenter and `pnpm generate` after.

## 5. Blueprint table

**Currency rule (applies throughout):** AR / AP / Revenue / Tax use the document's locked `exchangeRate`. **Inventory and COGS use `StockBalance.averageCost`, which is already in tenant base currency → never multiply by `exchangeRate`.**

**GL↔ledger invariant:** the Inventory GL amount must equal the stock-ledger capitalized value by construction (same cost number feeds both `postMovement` and the JE), or `1130` drifts from `Σ StockBalance`.

| Endpoint | Trigger | Debit (source) | Credit (source) | Amount | Dev notes |
|----------|---------|----------------|-----------------|--------|-----------|
| **A. Purchase post** | Draft → Posted | **Inventory** `FS.defaultInventoryAccountId` (stock lines) · **Purchase** `FS.defaultPurchaseAccountId` (service / non-stock lines) · **Input Tax** `FS.defaultTaxAccountId` | **AP** `party.payableAccountId ?? FS.defaultPayableAccountId` (`partyId` set on line) | Inventory = Σ(stock line `qty × unitCost`) = exactly what `postMovement` capitalizes. Tax = `taxAmount × rate`. AP = `total × rate` | Split lines into stock vs service. GL inventory amount must byte-match stock-ledger value. Invoice-level discount allocation → follow-up |
| **B. Sales post** | Draft → Posted | Revenue leg (unchanged): **AR** `party.receivableAccountId ?? FS.defaultReceivableAccountId` · COGS leg (new): **COGS** `FS.defaultCogsAccountId` | **Sales** `FS.defaultSalesAccountId` · **Tax** `FS.defaultTaxAccountId` · Inventory leg (new): **Inventory** `FS.defaultInventoryAccountId` | Revenue leg at `rate`. COGS = Σ(stock line `qty × averageCost`), **no rate** | Reuse the exact `balance.averageCost` already read for the SALE movement so the GL credit == stock value removed. Service items: no COGS leg |
| **C. Invoice cancel** | Posted → Cancelled | Reverse of A / B | Reverse of A / B | Read the **original** posted JE(s) for this `referenceId` and negate line-by-line | Reverse COGS/Inventory at *original* cost, not recomputed `averageCost` (which drifts). Replaces current reversal that re-derives stock at `unitPrice` |
| **D. Stock-count post** | Draft → Posted | Surplus (`diff > 0`): **Inventory** · Shortage (`diff < 0`): **Inv. Adjustment** `FS.defaultInventoryAdjustmentAccountId` | Surplus: **Inv. Adjustment** · Shortage: **Inventory** | Σ(`|diff| × averageCost`) | Fix `postMovement` call `unitCost: 0 → averageCost`. Net into one JE for the count. Service items already skipped |
| **E. Opening balance** | On register | **Inventory** `FS.defaultInventoryAccountId` | **Opening Equity** `FS.defaultOpeningEquityAccountId` | Σ(`qty × unitCost`) | Needs a `JOURNAL_ENTRY` doc-sequence number; one JE per call. `fiscalPeriodId` already on the DTO |
| **—. Payment allocate** | On allocate | *(none)* | *(none)* | *(none)* | No JE: cash & AR were posted at payment-post; allocation is sub-ledger bookkeeping only. Document explicitly |

## 6. Cross-cutting dev concerns

1. **Atomicity (in scope — existing latent bug).** `postMovement` currently opens its *own* `$transaction` and runs **before** the GL `$transaction`. If GL posting fails, stock has already moved. Rework so stock movement + GL entry + entity-status update commit in **one** transaction — e.g. extract an internal `postMovementTx(tx, params)` that the posting services call inside their existing `$transaction`, leaving the public `postMovement` as a thin self-transaction wrapper for standalone callers.
2. **Fiscal-period lock (in scope).** No posting/cancel service checks `FiscalPeriod.status`. Add a guard that refuses post/cancel when the target period's status ≠ `OPEN` (`CLOSED` / `LOCKED` → `BadRequestException`).
3. **Currency.** COGS/Inventory legs never multiplied by `exchangeRate`; revenue/AR/AP/tax legs at the locked rate. Encode in the line builders so it can't be got wrong at call sites.
4. **GL↔ledger equality invariant.** See §5. Same cost number feeds both sides.
5. **Reversal integrity.** Cancellations negate the original posted JE for the `referenceId` rather than recomputing — guarantees exact reversal even after `averageCost` drift.
6. **Migration deferral.** Schema + seed land as one migration to run when the advisory lock clears. `getOrThrow` blocks posting until the new accounts are configured.

## 7. Follow-ups (explicitly out of scope)

- **Invoice-level discount → inventory cost allocation.** When an invoice carries a header-level `discountAmount`, deciding how much of it reduces the capitalized cost of each stock line (pro-rata vs. treat as a purchase price variance) is deferred. Current rule: capitalize stock lines at the same `unitCost` that feeds `postMovement`; header discount does not currently adjust that cost.
- Warehouse transfers (`TRANSFER_IN` / `TRANSFER_OUT`) — enum exists, no endpoint.
- Manual journal entries, cashbox opening balances / adjustments — no endpoints.

## 8. Affected files (orientation, not exhaustive)

- `packages/db-prisma/src/schema/financial-setting.prisma`, `accounting.prisma` (relations)
- `packages/db-prisma/src/seed/seeds/chart-of-accounts.seed.ts`, `seed-ids.ts`
- `apps/api/src/modules/invoicing/invoices/invoice-journal.ts`, `invoice-posting.service.ts`
- `apps/api/src/modules/inventory/inventory.service.ts` (atomicity + tx helper, opening-balance JE)
- `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts` (variance JE + `unitCost` fix)
- `apps/api/src/modules/accounting/financial-settings/**` (DTO/presenter/service for new fields)
- Shared: `create-posting-journal-entry.ts` (reused as-is), a new inventory-JE line builder
