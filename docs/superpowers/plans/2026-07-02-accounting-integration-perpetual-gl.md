# Perpetual Inventory GL Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire invoices, stock-counts, and opening balances into the double-entry GL engine using perpetual inventory (capitalize purchases to Inventory, post COGS on sale, post stock-count variance and opening-balance journal entries), fix the stock+GL atomicity gap, and guard postings against closed fiscal periods.

**Architecture:** Reuse the existing posting tail `createPostingJournalEntry(tx, input)` and the pure line-builder pattern. Add new pure builders for the inventory/COGS/variance/opening legs. Route to new tenant-configurable `FinancialSetting` accounts. Make each posting flow commit its stock movements, journal entry, and entity-status change inside **one** `$transaction`.

**Tech Stack:** NestJS, Prisma (`@devloggers/db-prisma`), Jest + ts-jest (unit tests with mocked Prisma), `@devloggers/api-contracts` (OpenAPI-generated types).

## Global Constraints

- **Deferred migration:** the shared DB is under an advisory lock — do **not** run `db:migrate:dev`. Update the Prisma schema, run `db:generate` (types only, no DB), and hand-author the migration SQL file to be applied later. Same pattern as the tenant-settings/expenses branches.
- **Swagger decorators mandatory:** every new DTO field carries a complete `@ApiPropertyOptional({ type: 'string', nullable: true })` (per `.ai/rules/api.md`). After any backend DTO change, run `pnpm generate` and never patch types with `as any` / `@ts-ignore`.
- **Resource keys / account routing:** never hardcode account IDs in logic — read them from `FinancialSetting`. Currency rule: **AR/AP/Revenue/Tax legs use the document `exchangeRate`; Inventory/COGS legs are already in base currency — never multiply them by `exchangeRate`.** To keep the GL Inventory balance equal to `Σ StockBalance` value, purchase movements are capitalized at `unitPrice × exchangeRate` (base) and COGS uses `averageCost` (base) directly.
- **Money:** all amounts rounded to 4 decimals via the existing `round()` helper (`Math.round(v * 10000) / 10000`).
- **Test command:** `pnpm --filter @devloggers/api test -- <pattern>` (jest matches the pattern against the spec file path).
- **Branch:** `feat/accounting-integration`. Commit after every task.

---

### Task 1: Schema, seed accounts & settings (deferred migration)

Adds the four new `FinancialSetting` account columns, two new chart-of-accounts leaves, and seeds their defaults. Types are regenerated from the schema without touching the DB.

**Files:**
- Modify: `packages/db-prisma/src/schema/financial-setting.prisma`
- Modify: `packages/db-prisma/src/schema/accounting.prisma` (ChartOfAccount back-relations)
- Modify: `packages/db-prisma/src/seed/seed-ids.ts`
- Modify: `packages/db-prisma/src/seed/seeds/chart-of-accounts.seed.ts`
- Modify: `packages/db-prisma/src/seed/seeds/financial-settings.seed.ts`
- Create: `packages/db-prisma/src/schema/migrations/<YYYYMMDDHHMMSS>_perpetual_inventory_gl/migration.sql`

**Interfaces:**
- Produces: `FinancialSetting.defaultInventoryAccountId`, `.defaultCogsAccountId`, `.defaultInventoryAdjustmentAccountId`, `.defaultOpeningEquityAccountId` (all `string | null`) on the generated Prisma type; `SEED_IDS.ACCT_5200_INV_ADJUSTMENT`, `SEED_IDS.ACCT_3300_OPENING_EQUITY`.

- [ ] **Step 1: Add the four fields + relations to `financial-setting.prisma`**

Insert after the `defaultPayableAccountId` field:

```prisma
    defaultInventoryAccountId           String?  @map("default_inventory_account_id")
    defaultCogsAccountId                String?  @map("default_cogs_account_id")
    defaultInventoryAdjustmentAccountId String?  @map("default_inventory_adjustment_account_id")
    defaultOpeningEquityAccountId       String?  @map("default_opening_equity_account_id")
```

Insert after the `defaultPayableAccount` relation:

```prisma
    defaultInventoryAccount           ChartOfAccount? @relation("DefaultInventoryAccount", fields: [defaultInventoryAccountId], references: [id])
    defaultCogsAccount                ChartOfAccount? @relation("DefaultCogsAccount", fields: [defaultCogsAccountId], references: [id])
    defaultInventoryAdjustmentAccount ChartOfAccount? @relation("DefaultInventoryAdjustmentAccount", fields: [defaultInventoryAdjustmentAccountId], references: [id])
    defaultOpeningEquityAccount       ChartOfAccount? @relation("DefaultOpeningEquityAccount", fields: [defaultOpeningEquityAccountId], references: [id])
```

- [ ] **Step 2: Add matching back-relations on `ChartOfAccount` in `accounting.prisma`**

Insert after the `defaultPayableFor FinancialSetting[] @relation("DefaultPayableAccount")` line:

```prisma
    defaultInventoryFor           FinancialSetting[] @relation("DefaultInventoryAccount")
    defaultCogsFor                FinancialSetting[] @relation("DefaultCogsAccount")
    defaultInventoryAdjustmentFor FinancialSetting[] @relation("DefaultInventoryAdjustmentAccount")
    defaultOpeningEquityFor       FinancialSetting[] @relation("DefaultOpeningEquityAccount")
```

- [ ] **Step 3: Add the two seed IDs to `seed-ids.ts`**

In the `// Cost of Sales` region add, and in the `// Equity` region add (the encoded-code suffixes are collision-free):

```ts
    // Cost of Sales
    ACCT_5200_INV_ADJUSTMENT:  '00000000-0000-4000-a602-000000005200',
    // Equity (add near ACCT_3200_RETAINED)
    ACCT_3300_OPENING_EQUITY:  '00000000-0000-4000-a602-000000003300',
```

- [ ] **Step 4: Seed the two new accounts in `chart-of-accounts.seed.ts`**

Add inside the Level-3 `Promise.all([...])`:

```ts
        // Inventory adjustment (under Cost of Sales)
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_5200_INV_ADJUSTMENT, tenantId, code: '5200', name: n('تسويات المخزون', 'Inventory Adjustment'), type: 'EXPENSE', parentId: SEED_IDS.ACCT_COST_OF_SALES } }),
        // Opening balance equity (under Equity)
        prisma.chartOfAccount.create({ data: { id: SEED_IDS.ACCT_3300_OPENING_EQUITY, tenantId, code: '3300', name: n('رأس المال الافتتاحي', 'Opening Balance Equity'), type: 'EQUITY', parentId: SEED_IDS.ACCT_EQUITY } }),
```

- [ ] **Step 5: Seed the new defaults in `financial-settings.seed.ts`**

Add to the `create` object (leave `update: {}` as-is — idempotent):

```ts
            defaultInventoryAccountId:           SEED_IDS.ACCT_1130_INVENTORY,
            defaultCogsAccountId:                SEED_IDS.ACCT_5100_COGS,
            defaultInventoryAdjustmentAccountId: SEED_IDS.ACCT_5200_INV_ADJUSTMENT,
            defaultOpeningEquityAccountId:       SEED_IDS.ACCT_3300_OPENING_EQUITY,
```

- [ ] **Step 6: Hand-author the deferred migration SQL**

Create `packages/db-prisma/src/schema/migrations/<YYYYMMDDHHMMSS>_perpetual_inventory_gl/migration.sql` (use a current UTC timestamp for the folder, matching the existing `<ts>_<name>` convention):

```sql
ALTER TABLE "financial_settings"
    ADD COLUMN "default_inventory_account_id" TEXT,
    ADD COLUMN "default_cogs_account_id" TEXT,
    ADD COLUMN "default_inventory_adjustment_account_id" TEXT,
    ADD COLUMN "default_opening_equity_account_id" TEXT;

ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_inventory_account_id_fkey" FOREIGN KEY ("default_inventory_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_cogs_account_id_fkey" FOREIGN KEY ("default_cogs_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_inventory_adjustment_account_id_fkey" FOREIGN KEY ("default_inventory_adjustment_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_default_opening_equity_account_id_fkey" FOREIGN KEY ("default_opening_equity_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

> Do **not** run `db:migrate:dev`. This file is applied when the shared-DB advisory lock clears.

- [ ] **Step 7: Regenerate the Prisma client types (no DB)**

Run: `pnpm --filter @devloggers/db-prisma db:generate`
Expected: succeeds; the generated `FinancialSetting` type now includes the four new fields.

- [ ] **Step 8: Commit**

```bash
git add packages/db-prisma
git commit -m "feat(db): add perpetual inventory GL accounts + financial-setting fields (deferred migration)"
```

---

### Task 2: Expose new FinancialSetting fields through DTOs + repository

Surfaces the four new accounts in the contracts DTO, the API Swagger DTO, and the repository `include`, then regenerates OpenAPI types.

**Files:**
- Modify: `packages/api-contracts/src/dto/financial-setting.dto.ts`
- Modify: `apps/api/src/modules/accounting/financial-settings/financial-settings.dto.ts`
- Modify: `apps/api/src/modules/accounting/financial-settings/repositories/financial-settings.repository.ts`

**Interfaces:**
- Consumes: Prisma `FinancialSetting` fields from Task 1.
- Produces: `UpsertFinancialSettingDto` and `FinancialSettingResponseDto` (contracts) carry the four new optional `string | null` fields.

- [ ] **Step 1: Extend the contracts DTO**

In `packages/api-contracts/src/dto/financial-setting.dto.ts`, add to **both** interfaces (Upsert as optional, Response as `string | null`):

```ts
// in UpsertFinancialSettingDto:
    defaultInventoryAccountId?: string | null;
    defaultCogsAccountId?: string | null;
    defaultInventoryAdjustmentAccountId?: string | null;
    defaultOpeningEquityAccountId?: string | null;

// in FinancialSettingResponseDto:
    defaultInventoryAccountId: string | null;
    defaultCogsAccountId: string | null;
    defaultInventoryAdjustmentAccountId: string | null;
    defaultOpeningEquityAccountId: string | null;
```

- [ ] **Step 2: Extend the API Swagger body DTO**

In `apps/api/src/modules/accounting/financial-settings/financial-settings.dto.ts`, add to `UpsertFinancialSettingBodyDto`:

```ts
    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000003', description: 'Default inventory asset account' })
    @IsOptional() @IsString()
    defaultInventoryAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000000016', description: 'Default cost-of-goods-sold account' })
    @IsOptional() @IsString()
    defaultCogsAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000005200', description: 'Default inventory adjustment / shrinkage account' })
    @IsOptional() @IsString()
    defaultInventoryAdjustmentAccountId?: string | null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '00000000-0000-4000-a602-000000003300', description: 'Default opening-balance equity account' })
    @IsOptional() @IsString()
    defaultOpeningEquityAccountId?: string | null;
```

And add the four resolved relations to `FinancialSettingResponseDto`:

```ts
    @Type(() => ChartOfAccountResponseDto)
    defaultInventoryAccount: ChartOfAccountResponseDto | null = null
    @Type(() => ChartOfAccountResponseDto)
    defaultCogsAccount: ChartOfAccountResponseDto | null = null
    @Type(() => ChartOfAccountResponseDto)
    defaultInventoryAdjustmentAccount: ChartOfAccountResponseDto | null = null
    @Type(() => ChartOfAccountResponseDto)
    defaultOpeningEquityAccount: ChartOfAccountResponseDto | null = null
```

- [ ] **Step 3: Add the relations to the repository `include`**

In `financial-settings.repository.ts` `findByTenantId`, add to the `include`:

```ts
                defaultInventoryAccount: true,
                defaultCogsAccount: true,
                defaultInventoryAdjustmentAccount: true,
                defaultOpeningEquityAccount: true,
```

- [ ] **Step 4: Regenerate OpenAPI types + build contracts**

Run: `pnpm generate`
Expected: succeeds; `packages/api-contracts/types/index.ts` reflects the new fields; `@devloggers/api-contracts` builds.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts apps/api/src/modules/accounting/financial-settings
git commit -m "feat(accounting): expose new perpetual GL accounts in financial-settings DTOs"
```

---

### Task 3: Fiscal-period lock guard (pure helper, TDD)

A pure guard used by every posting/cancel flow to refuse non-`OPEN` periods.

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/utils/assert-period-open.ts`
- Test: `apps/api/src/modules/accounting/accounts/utils/assert-period-open.spec.ts`

**Interfaces:**
- Produces: `assertFiscalPeriodOpen(status: string | null | undefined, periodLabel?: string): void` — throws `BadRequestException` unless `status === 'OPEN'`.

- [ ] **Step 1: Write the failing test**

```ts
import { assertFiscalPeriodOpen } from './assert-period-open';

describe('assertFiscalPeriodOpen', () => {
    it('passes for an OPEN period', () => {
        expect(() => assertFiscalPeriodOpen('OPEN')).not.toThrow();
    });
    it('throws for a CLOSED period', () => {
        expect(() => assertFiscalPeriodOpen('CLOSED')).toThrow(/closed/i);
    });
    it('throws for a LOCKED period', () => {
        expect(() => assertFiscalPeriodOpen('LOCKED')).toThrow(/locked/i);
    });
    it('throws for a missing period', () => {
        expect(() => assertFiscalPeriodOpen(null)).toThrow(/OPEN/);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- assert-period-open`
Expected: FAIL with "Cannot find module './assert-period-open'".

- [ ] **Step 3: Write the implementation**

```ts
import { BadRequestException } from '@nestjs/common';

/**
 * Throws unless the given fiscal-period status is OPEN.
 * Used by all posting/cancel flows to block writes to CLOSED / LOCKED periods.
 */
export function assertFiscalPeriodOpen(
    status: string | null | undefined,
    periodLabel = 'fiscal period',
): void {
    if (status !== 'OPEN') {
        const state = status ? status.toLowerCase() : 'missing';
        throw new BadRequestException(
            `Cannot post to a ${state} ${periodLabel}. Only OPEN periods accept postings.`,
        );
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- assert-period-open`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/utils/assert-period-open.ts apps/api/src/modules/accounting/accounts/utils/assert-period-open.spec.ts
git commit -m "feat(accounting): add fiscal-period-open guard"
```

---

### Task 4: Inventory-side journal builders (pure, TDD)

Pure builders for the COGS leg, stock-count variance leg, and opening-balance leg. All emit `PostingJournalLine[]` (the type `createPostingJournalEntry` consumes).

**Files:**
- Create: `apps/api/src/modules/accounting/accounts/utils/inventory-journal.ts`
- Test: `apps/api/src/modules/accounting/accounts/utils/inventory-journal.spec.ts`

**Interfaces:**
- Consumes: `PostingJournalLine` from `./create-posting-journal-entry`.
- Produces:
  - `buildCogsJournalLines({ cogsAccountId, inventoryAccountId, amount }, { reverse? }): PostingJournalLine[]`
  - `buildStockCountVarianceLines({ inventoryAccountId, adjustmentAccountId, netAmount }): PostingJournalLine[]` (netAmount > 0 = surplus)
  - `buildOpeningBalanceLines({ inventoryAccountId, openingEquityAccountId, amount }): PostingJournalLine[]`

- [ ] **Step 1: Write the failing test**

```ts
import {
    buildCogsJournalLines,
    buildStockCountVarianceLines,
    buildOpeningBalanceLines,
} from './inventory-journal';

const sum = (ls: { debit: number; credit: number }[]) => ({
    d: ls.reduce((s, l) => s + l.debit, 0),
    c: ls.reduce((s, l) => s + l.credit, 0),
});

describe('buildCogsJournalLines', () => {
    it('debits COGS and credits Inventory, balanced', () => {
        const ls = buildCogsJournalLines({ cogsAccountId: 'cogs', inventoryAccountId: 'inv', amount: 250 });
        expect(ls[0]).toEqual({ accountId: 'cogs', debit: 250, credit: 0, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'inv', debit: 0, credit: 250, description: null, sortOrder: 1 });
        expect(sum(ls)).toEqual({ d: 250, c: 250 });
    });
    it('swaps sides when reverse=true', () => {
        const ls = buildCogsJournalLines({ cogsAccountId: 'cogs', inventoryAccountId: 'inv', amount: 250 }, { reverse: true });
        expect(ls[0]).toEqual({ accountId: 'cogs', debit: 0, credit: 250, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'inv', debit: 250, credit: 0, description: null, sortOrder: 1 });
    });
});

describe('buildStockCountVarianceLines', () => {
    it('surplus: debits Inventory, credits Adjustment', () => {
        const ls = buildStockCountVarianceLines({ inventoryAccountId: 'inv', adjustmentAccountId: 'adj', netAmount: 80 });
        expect(ls[0]).toEqual({ accountId: 'inv', debit: 80, credit: 0, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'adj', debit: 0, credit: 80, description: null, sortOrder: 1 });
        expect(sum(ls)).toEqual({ d: 80, c: 80 });
    });
    it('shortage: debits Adjustment, credits Inventory', () => {
        const ls = buildStockCountVarianceLines({ inventoryAccountId: 'inv', adjustmentAccountId: 'adj', netAmount: -80 });
        expect(ls[0]).toEqual({ accountId: 'inv', debit: 0, credit: 80, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'adj', debit: 80, credit: 0, description: null, sortOrder: 1 });
    });
});

describe('buildOpeningBalanceLines', () => {
    it('debits Inventory, credits Opening Equity, balanced', () => {
        const ls = buildOpeningBalanceLines({ inventoryAccountId: 'inv', openingEquityAccountId: 'oe', amount: 1200 });
        expect(ls[0]).toEqual({ accountId: 'inv', debit: 1200, credit: 0, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'oe', debit: 0, credit: 1200, description: null, sortOrder: 1 });
        expect(sum(ls)).toEqual({ d: 1200, c: 1200 });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- inventory-journal`
Expected: FAIL with "Cannot find module './inventory-journal'".

- [ ] **Step 3: Write the implementation**

```ts
import type { PostingJournalLine } from './create-posting-journal-entry';

function round(v: number): number {
    return Math.round(v * 10000) / 10000;
}

/** Sales COGS leg: DR COGS / CR Inventory at base-currency cost. */
export function buildCogsJournalLines(
    input: { cogsAccountId: string; inventoryAccountId: string; amount: number },
    opts: { reverse?: boolean } = {},
): PostingJournalLine[] {
    const rev = opts.reverse ?? false;
    const amt = round(input.amount);
    return [
        { accountId: input.cogsAccountId, debit: rev ? 0 : amt, credit: rev ? amt : 0, description: null, sortOrder: 0 },
        { accountId: input.inventoryAccountId, debit: rev ? amt : 0, credit: rev ? 0 : amt, description: null, sortOrder: 1 },
    ];
}

/** Stock-count variance: netAmount > 0 = surplus (Inventory up), < 0 = shortage. */
export function buildStockCountVarianceLines(
    input: { inventoryAccountId: string; adjustmentAccountId: string; netAmount: number },
): PostingJournalLine[] {
    const amt = round(Math.abs(input.netAmount));
    const surplus = input.netAmount > 0;
    return [
        { accountId: input.inventoryAccountId, debit: surplus ? amt : 0, credit: surplus ? 0 : amt, description: null, sortOrder: 0 },
        { accountId: input.adjustmentAccountId, debit: surplus ? 0 : amt, credit: surplus ? amt : 0, description: null, sortOrder: 1 },
    ];
}

/** Opening inventory: DR Inventory / CR Opening Balance Equity. */
export function buildOpeningBalanceLines(
    input: { inventoryAccountId: string; openingEquityAccountId: string; amount: number },
): PostingJournalLine[] {
    const amt = round(input.amount);
    return [
        { accountId: input.inventoryAccountId, debit: amt, credit: 0, description: null, sortOrder: 0 },
        { accountId: input.openingEquityAccountId, debit: 0, credit: amt, description: null, sortOrder: 1 },
    ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- inventory-journal`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/utils/inventory-journal.ts apps/api/src/modules/accounting/accounts/utils/inventory-journal.spec.ts
git commit -m "feat(accounting): add COGS / stock-variance / opening-balance journal builders"
```

---

### Task 5: Purchase inventory split in `buildInvoiceJournalLines` (TDD)

Extends the invoice line builder so a purchase capitalizes its stock portion to Inventory and routes the remaining (service/non-stock) portion to the Purchase expense account. Backward-compatible: when no inventory portion is passed, all net goes to Purchase (as today).

**Files:**
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-journal.ts`
- Test: `apps/api/src/modules/invoicing/invoices/invoice-journal.spec.ts` (create)

**Interfaces:**
- Consumes: existing `InvoiceJournalInput`.
- Produces: `InvoiceJournalInput` gains optional `inventoryAmount?: number` (stock-line net, invoice currency) and `inventoryAccountId?: string`. PURCHASE emits an Inventory debit for `inventoryAmount × rate` and a Purchase debit for the remainder.

- [ ] **Step 1: Write the failing test**

```ts
import { buildInvoiceJournalLines, InvoiceJournalInput } from './invoice-journal';

const base: InvoiceJournalInput = {
    direction: 'PURCHASE',
    netAmount: 1000,
    taxAmount: 0,
    total: 1000,
    exchangeRate: 1,
    receivableAccountId: 'ar',
    payableAccountId: 'ap',
    salesAccountId: 'sales',
    purchaseAccountId: 'purchase',
    taxAccountId: null,
    partyId: 'party-1',
};
const sum = (ls: { debit: number; credit: number }[]) => ({
    d: ls.reduce((s, l) => s + l.debit, 0),
    c: ls.reduce((s, l) => s + l.credit, 0),
});

describe('buildInvoiceJournalLines — purchase inventory split', () => {
    it('capitalizes the stock portion to Inventory and the rest to Purchase', () => {
        const ls = buildInvoiceJournalLines({ ...base, inventoryAmount: 700, inventoryAccountId: 'inv' });
        const inv = ls.find((l) => l.accountId === 'inv');
        const pur = ls.find((l) => l.accountId === 'purchase');
        const ap = ls.find((l) => l.accountId === 'ap');
        expect(inv).toMatchObject({ debit: 700, credit: 0 });
        expect(pur).toMatchObject({ debit: 300, credit: 0 });
        expect(ap).toMatchObject({ debit: 0, credit: 1000, partyId: 'party-1' });
        expect(sum(ls)).toEqual({ d: 1000, c: 1000 });
    });

    it('routes all net to Inventory when the whole invoice is stock', () => {
        const ls = buildInvoiceJournalLines({ ...base, inventoryAmount: 1000, inventoryAccountId: 'inv' });
        expect(ls.find((l) => l.accountId === 'purchase')).toBeUndefined();
        expect(ls.find((l) => l.accountId === 'inv')).toMatchObject({ debit: 1000 });
        expect(sum(ls)).toEqual({ d: 1000, c: 1000 });
    });

    it('falls back to all-Purchase when no inventory portion is given', () => {
        const ls = buildInvoiceJournalLines(base);
        expect(ls.find((l) => l.accountId === 'inv')).toBeUndefined();
        expect(ls.find((l) => l.accountId === 'purchase')).toMatchObject({ debit: 1000 });
        expect(sum(ls)).toEqual({ d: 1000, c: 1000 });
    });

    it('reverses inventory + purchase sides when reverse=true', () => {
        const ls = buildInvoiceJournalLines({ ...base, inventoryAmount: 700, inventoryAccountId: 'inv' }, { reverse: true });
        expect(ls.find((l) => l.accountId === 'inv')).toMatchObject({ debit: 0, credit: 700 });
        expect(ls.find((l) => l.accountId === 'ap')).toMatchObject({ debit: 1000, credit: 0 });
        expect(sum(ls)).toEqual({ d: 1000, c: 1000 });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- invoice-journal`
Expected: FAIL (Inventory line not produced; `inventoryAmount` not on the type).

- [ ] **Step 3: Update the implementation**

In `invoice-journal.ts`, add to `InvoiceJournalInput`:

```ts
    /** Stock-line net (invoice currency) to capitalize to Inventory on a PURCHASE. Optional. */
    inventoryAmount?: number;
    /** Inventory account for the capitalized portion. Required when inventoryAmount > 0. */
    inventoryAccountId?: string;
```

Replace the entire `// PURCHASE` block (from `const lines: ... = [ { accountId: input.purchaseAccountId, ...} ]` through `return lines;`) with:

```ts
    // PURCHASE
    const invBase = round((input.inventoryAmount ?? 0) * rate);
    const expenseBase = round(netBase - invBase);
    const lines: (JournalLineInput & { partyId?: string })[] = [];

    if (invBase > 0 && input.inventoryAccountId) {
        lines.push({
            accountId: input.inventoryAccountId,
            debit: rev ? 0 : invBase,
            credit: rev ? invBase : 0,
            description: null,
            sortOrder: lines.length,
        });
    }
    if (expenseBase > 0) {
        lines.push({
            accountId: input.purchaseAccountId,
            debit: rev ? 0 : expenseBase,
            credit: rev ? expenseBase : 0,
            description: null,
            sortOrder: lines.length,
        });
    }
    if (taxBase > 0 && input.taxAccountId) {
        lines.push({
            accountId: input.taxAccountId,
            debit: rev ? 0 : taxBase,
            credit: rev ? taxBase : 0,
            description: null,
            sortOrder: lines.length,
        });
    }
    lines.push({
        accountId: input.payableAccountId,
        debit: rev ? totalBase : 0,
        credit: rev ? 0 : totalBase,
        description: null,
        sortOrder: lines.length,
        partyId: input.partyId,
    });
    return lines;
```

> Note (documented follow-up from the spec): when an invoice carries a header-level `discountAmount`, `expenseBase` could theoretically go negative if the stock lines' pre-header-discount net exceeds `netBase`. Header-discount → inventory-cost allocation is out of scope; callers pass `inventoryAmount` from line-level nets.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- invoice-journal`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices/invoice-journal.ts apps/api/src/modules/invoicing/invoices/invoice-journal.spec.ts
git commit -m "feat(invoicing): capitalize purchase stock lines to Inventory in journal builder"
```

---

### Task 6: Atomicity — transaction-aware stock movement (TDD)

Extracts `postMovementTx(tx, params)` so stock movements can run inside a caller's `$transaction`. The public `postMovement` becomes a thin self-transaction wrapper, preserving today's behavior for standalone callers.

**Files:**
- Modify: `apps/api/src/modules/inventory/inventory.service.ts`
- Test: `apps/api/src/modules/inventory/inventory.service.spec.ts` (create)

**Interfaces:**
- Produces: `InventoryService.postMovementTx(tx: InventoryTx, params: MovementParams): Promise<{ id: string }>` where `InventoryTx` is the structural Prisma-transaction type below. `postMovement(params)` delegates to it inside `this.prisma.$transaction`.

- [ ] **Step 1: Write the failing test**

```ts
import { InventoryService } from './inventory.service';
import { StockMovementType } from '@devloggers/db-prisma';

function buildTx(existingBalance: any = null) {
    return {
        stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv-1' }) },
        stockBalance: {
            findUnique: jest.fn().mockResolvedValue(existingBalance),
            create: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
        },
    };
}
const params = {
    tenantId: 't1', warehouseId: 'w1', itemId: 'i1', fiscalPeriodId: 'fp1',
    movementType: StockMovementType.PURCHASE, quantity: 10, unitCost: 5, userId: 'u1',
};

describe('InventoryService.postMovementTx', () => {
    it('creates a movement and a new balance on first entry', async () => {
        const tx = buildTx(null);
        const svc = new InventoryService({} as any, {} as any, {} as any);
        await svc.postMovementTx(tx as any, params);
        expect(tx.stockMovement.create).toHaveBeenCalled();
        expect(tx.stockBalance.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ quantity: 10, averageCost: 5 }) }),
        );
    });

    it('recomputes weighted-average cost on an inflow', async () => {
        const tx = buildTx({ id: 'b1', quantity: 10, averageCost: 4 });
        const svc = new InventoryService({} as any, {} as any, {} as any);
        await svc.postMovementTx(tx as any, params); // +10 @ 5 over 10 @ 4 => avg 4.5
        expect(tx.stockBalance.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ quantity: 20, averageCost: 4.5 }) }),
        );
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- inventory.service`
Expected: FAIL with "postMovementTx is not a function".

- [ ] **Step 3: Refactor `inventory.service.ts`**

Add the structural tx type near the top (after imports):

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

Replace the body of `postMovement` and add `postMovementTx`:

```ts
    /**
     * Transaction-aware core posting engine. Runs inside the caller's $transaction
     * so stock + GL + entity-status changes commit atomically.
     */
    async postMovementTx(tx: InventoryTx, params: MovementParams): Promise<{ id: string }> {
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
        return this.prisma.$transaction((tx) => this.postMovementTx(tx as unknown as InventoryTx, params));
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- inventory.service`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/inventory/inventory.service.ts apps/api/src/modules/inventory/inventory.service.spec.ts
git commit -m "refactor(inventory): add transaction-aware postMovementTx for atomic posting"
```

---

### Task 7: Perpetual purchase & sales posting + atomicity + period guard (TDD)

Rewrites `postPurchaseInvoice` and `postSalesInvoice` to (a) capitalize/COGS via the new builders, (b) run stock movements + GL + status in one `$transaction` using `postMovementTx`, and (c) guard the fiscal period.

**Files:**
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts`
- Test: `apps/api/src/modules/invoicing/invoices/invoice-posting.perpetual.spec.ts` (create)

**Interfaces:**
- Consumes: `buildInvoiceJournalLines` (Task 5), `buildCogsJournalLines` (Task 4), `InventoryService.postMovementTx` (Task 6), `assertFiscalPeriodOpen` (Task 3), `createPostingJournalEntry`.
- Produces: unchanged public method signatures `postPurchaseInvoice/postSalesInvoice/cancelInvoice(tenantId, invoiceId, userId)`.

- [ ] **Step 1: Write the failing test** (purchase capitalizes; sales posts COGS; both guard period)

```ts
import { InvoicePostingService } from './invoice-posting.service';

function deps(settings: any) {
    const tx = {
        stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
        stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'b', quantity: 100, averageCost: 3 }), create: jest.fn(), update: jest.fn() },
        journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je' }) },
        chartOfAccount: { findUnique: jest.fn().mockResolvedValue({ type: 'ASSET' }), update: jest.fn() },
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv', status: 'POSTED' }) },
        item: { update: jest.fn() },
    };
    const prisma = { invoice: { findFirst: jest.fn() }, item: { findUnique: jest.fn() }, $transaction: jest.fn((cb: any) => cb(tx)) } as any;
    const inventory = { postMovementTx: jest.fn() } as any;
    const fs = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    const seq = { getNextNumber: jest.fn().mockResolvedValue('JE-1') } as any;
    return { svc: new InvoicePostingService(prisma, inventory, fs, seq), prisma, tx, inventory };
}
const SETTINGS = {
    defaultReceivableAccountId: 'ar', defaultPayableAccountId: 'ap', defaultSalesAccountId: 'sales',
    defaultPurchaseAccountId: 'purchase', defaultTaxAccountId: null,
    defaultInventoryAccountId: 'inv', defaultCogsAccountId: 'cogs',
};
const stockLine = { itemId: 'i1', quantity: 2, unitPrice: 300, total: 600, taxAmount: 0, item: { itemType: 'product' } };

describe('InvoicePostingService — perpetual', () => {
    it('purchase: capitalizes stock lines to Inventory and posts movement in-tx', async () => {
        const { svc, prisma, tx, inventory } = deps(SETTINGS);
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'P1',
            exchangeRate: 1, subtotal: 600, discountAmount: 0, taxAmount: 0, total: 600, partyId: 'p1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [stockLine],
            party: { payableAccountId: null }, fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postPurchaseInvoice('t', 'inv', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'PURCHASE', unitCost: 300 }));
        const jeArg = tx.journalEntry.create.mock.calls[0][0].data.lines.create;
        expect(jeArg.some((l: any) => l.accountId === 'inv' && Number(l.debit) === 600)).toBe(true);
    });

    it('sale: posts a COGS leg at averageCost with no rate applied', async () => {
        const { svc, prisma, tx } = deps(SETTINGS);
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'S1',
            exchangeRate: 1, subtotal: 1000, discountAmount: 0, taxAmount: 0, total: 1000, partyId: 'p1',
            invoiceType: { direction: 'SALE', affectsStock: true }, lines: [{ ...stockLine, quantity: 2, unitPrice: 500, total: 1000 }],
            party: { receivableAccountId: null }, fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postSalesInvoice('t', 'inv', 'u');
        const lines = tx.journalEntry.create.mock.calls[0][0].data.lines.create;
        // avgCost 3 * qty 2 = 6
        expect(lines.some((l: any) => l.accountId === 'cogs' && Number(l.debit) === 6)).toBe(true);
        expect(lines.some((l: any) => l.accountId === 'inv' && Number(l.credit) === 6)).toBe(true);
    });

    it('rejects posting to a CLOSED period', async () => {
        const { svc, prisma } = deps(SETTINGS);
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', number: 'S2',
            invoiceType: { direction: 'SALE', affectsStock: false }, lines: [], party: {},
            fiscalPeriod: { status: 'CLOSED' }, exchangeRate: 1, subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0, partyId: 'p1', date: new Date(),
        });
        await expect(svc.postSalesInvoice('t', 'inv', 'u')).rejects.toThrow(/closed/i);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- invoice-posting.perpetual`
Expected: FAIL (COGS lines absent; movement not on tx; no period guard).

- [ ] **Step 3: Rewrite `postPurchaseInvoice`**

Add imports at the top:

```ts
import { buildCogsJournalLines } from '../../accounting/accounts/utils/inventory-journal';
import { assertFiscalPeriodOpen } from '../../accounting/accounts/utils/assert-period-open';
```

Add `fiscalPeriod: { select: { status: true } }` to the `include` of the `findFirst` in **all three** methods.

Replace the `postPurchaseInvoice` body (after the existing validation block that ends with the `defaultPurchaseAccountId` check) so stock + GL + status share one transaction:

```ts
        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);

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
        if (inventoryAmount > 0 && !settings.defaultInventoryAccountId) {
            throw new BadRequestException('No default Inventory account configured in Financial Settings.');
        }

        const journalLines = buildInvoiceJournalLines({
            direction: 'PURCHASE',
            netAmount,
            taxAmount: Number(invoice.taxAmount),
            total: Number(invoice.total),
            exchangeRate,
            receivableAccountId: settings.defaultReceivableAccountId ?? '',
            payableAccountId,
            salesAccountId: settings.defaultSalesAccountId ?? '',
            purchaseAccountId: settings.defaultPurchaseAccountId,
            taxAccountId: settings.defaultTaxAccountId ?? null,
            partyId: invoice.partyId,
            inventoryAmount,
            inventoryAccountId: settings.defaultInventoryAccountId ?? undefined,
        });

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        return this.prisma.$transaction(async (tx) => {
            if (invoice.invoiceType.affectsStock) {
                for (const line of stockLines) {
                    await this.inventoryService.postMovementTx(tx as any, {
                        tenantId,
                        warehouseId: invoice.warehouseId!,
                        itemId: line.itemId,
                        fiscalPeriodId: invoice.fiscalPeriodId,
                        movementType: StockMovementType.PURCHASE,
                        quantity: Number(line.quantity),
                        unitCost: Number(line.unitPrice) * exchangeRate,
                        referenceType: 'invoice',
                        referenceId: invoice.id,
                        userId,
                    });
                    await tx.item.update({ where: { id: line.itemId }, data: { latestPurchasePrice: line.unitPrice } });
                }
            }

            await createPostingJournalEntry(tx, {
                tenantId,
                number: jeNumber,
                date: invoice.date,
                fiscalPeriodId: invoice.fiscalPeriodId,
                referenceType: 'invoice',
                referenceId: invoice.id,
                description: `Purchase invoice ${invoice.number}`,
                exchangeRate,
                userId,
                lines: journalLines,
            });

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
```

Remove the old pre-transaction stock-movement loop and the old standalone `$transaction` that only did GL + status.

- [ ] **Step 4: Rewrite `postSalesInvoice`**

Replace its body (after the `defaultSalesAccountId` validation) with a single transaction that reads balances, checks availability, accumulates COGS, posts movements, then posts revenue + COGS legs:

```ts
        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);

        const exchangeRate = Number(invoice.exchangeRate);
        const netAmount = Number(invoice.subtotal) - Number(invoice.discountAmount);
        const stockLines = invoice.invoiceType.affectsStock
            ? invoice.lines.filter((l) => l.item.itemType !== 'service')
            : [];
        if (stockLines.length > 0 && (!settings.defaultCogsAccountId || !settings.defaultInventoryAccountId)) {
            throw new BadRequestException('No default COGS / Inventory account configured in Financial Settings.');
        }

        const revenueLines = buildInvoiceJournalLines({
            direction: 'SALE',
            netAmount,
            taxAmount: Number(invoice.taxAmount),
            total: Number(invoice.total),
            exchangeRate,
            receivableAccountId,
            payableAccountId: settings.defaultPayableAccountId ?? '',
            salesAccountId: settings.defaultSalesAccountId,
            purchaseAccountId: settings.defaultPurchaseAccountId ?? '',
            taxAccountId: settings.defaultTaxAccountId ?? null,
            partyId: invoice.partyId,
        });

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

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
                await this.inventoryService.postMovementTx(tx as any, {
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

            const cogsLines = cogsTotal > 0
                ? buildCogsJournalLines({
                    cogsAccountId: settings.defaultCogsAccountId!,
                    inventoryAccountId: settings.defaultInventoryAccountId!,
                    amount: cogsTotal,
                }).map((l, i) => ({ ...l, sortOrder: revenueLines.length + i }))
                : [];

            await createPostingJournalEntry(tx, {
                tenantId,
                number: jeNumber,
                date: invoice.date,
                fiscalPeriodId: invoice.fiscalPeriodId,
                referenceType: 'invoice',
                referenceId: invoice.id,
                description: `Sales invoice ${invoice.number}`,
                exchangeRate,
                userId,
                lines: [...revenueLines, ...cogsLines],
            });

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'POSTED', postedAt: new Date(), postedBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @devloggers/api test -- invoice-posting`
Expected: PASS — the new `invoice-posting.perpetual` suite plus the existing `invoice-posting.service` cancel suite (Task 8 updates the latter).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts apps/api/src/modules/invoicing/invoices/invoice-posting.perpetual.spec.ts
git commit -m "feat(invoicing): perpetual purchase/sales posting with atomic stock+GL and period guard"
```

---

### Task 8: Invoice cancellation reverses COGS/Inventory from the original JE (TDD)

Cancellation must reverse the exact original posted lines (including the COGS/Inventory leg) rather than recomputing from drifting `averageCost`, and run stock reversal + GL + status in one transaction.

**Files:**
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts`
- Modify: `apps/api/src/modules/invoicing/invoices/invoice-posting.service.spec.ts`

**Interfaces:**
- Consumes: original `JournalEntry` + `lines` fetched by `referenceType: 'invoice'`, `referenceId: invoiceId`.
- Produces: cancellation JE whose lines are the sign-flipped originals; stock reversal posted via `postMovementTx`.

- [ ] **Step 1: Update the existing cancel test + add a reversal-source test**

Update `buildDeps()` in `invoice-posting.service.spec.ts` so `tx` includes the delegates the new flow uses and `prisma` can load the original entry:

```ts
    const tx = {
        journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je-rev' }) },
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'CANCELLED' }) },
        chartOfAccount: { findUnique: jest.fn().mockResolvedValue({ type: 'ASSET' }), update: jest.fn() },
        stockMovement: { create: jest.fn() },
        stockBalance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const prisma = {
        invoice: { findFirst: jest.fn() },
        journalEntry: { findFirst: jest.fn().mockResolvedValue({
            id: 'je-orig',
            lines: [
                { accountId: 'ar', debit: 1000, credit: 0, partyId: 'party-1', description: null, sortOrder: 0 },
                { accountId: 'sales', debit: 0, credit: 1000, partyId: null, description: null, sortOrder: 1 },
            ],
        }) },
        $transaction: jest.fn((cb: any) => cb(tx)),
    } as any;
```

Add a test asserting the reversal negates the original lines:

```ts
    it('reverses the original journal entry line-for-line', async () => {
        const { service, prisma, tx } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, warehouseId: null, invoiceType: { direction: 'SALE', affectsStock: false }, paymentAllocations: [], fiscalPeriod: { status: 'OPEN' } });
        await service.cancelInvoice('tenant-1', 'inv-1', 'user-1');
        const revLines = tx.journalEntry.create.mock.calls[0][0].data.lines.create;
        expect(revLines).toEqual(expect.arrayContaining([
            expect.objectContaining({ accountId: 'ar', debit: 0, credit: 1000 }),
            expect.objectContaining({ accountId: 'sales', debit: 1000, credit: 0 }),
        ]));
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- invoice-posting.service`
Expected: FAIL (reversal still built from `buildInvoiceJournalLines`, no `journalEntry.findFirst` used).

- [ ] **Step 3: Rewrite `cancelInvoice`**

Replace the reversal-building + transaction section (after the `paymentAllocations` guard) with:

```ts
        assertFiscalPeriodOpen(invoice.fiscalPeriod?.status);

        const original = await this.prisma.journalEntry.findFirst({
            where: { tenantId, referenceType: 'invoice', referenceId: invoice.id, status: 'POSTED' },
            include: { lines: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!original) throw new BadRequestException('Original journal entry not found for this invoice.');

        const reversalLines = original.lines.map((l, i) => ({
            accountId: l.accountId,
            debit: Number(l.credit),
            credit: Number(l.debit),
            description: l.description,
            sortOrder: i,
            partyId: l.partyId ?? null,
        }));

        const isPurchase = invoice.invoiceType.direction === 'PURCHASE';
        const exchangeRate = Number(invoice.exchangeRate);
        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        return this.prisma.$transaction(async (tx) => {
            if (invoice.invoiceType.affectsStock && invoice.warehouseId) {
                for (const line of invoice.lines) {
                    if (line.item.itemType !== 'service') {
                        await this.inventoryService.postMovementTx(tx as any, {
                            tenantId,
                            warehouseId: invoice.warehouseId,
                            itemId: line.itemId,
                            fiscalPeriodId: invoice.fiscalPeriodId,
                            movementType: StockMovementType.ADJUSTMENT,
                            quantity: isPurchase ? -Number(line.quantity) : Number(line.quantity),
                            unitCost: Number(line.unitPrice) * exchangeRate,
                            referenceType: 'invoice_cancellation',
                            referenceId: invoice.id,
                            notes: `Cancellation of invoice ${invoice.number}`,
                            userId,
                        });
                    }
                }
            }

            await createPostingJournalEntry(tx, {
                tenantId,
                number: jeNumber,
                date: new Date(),
                fiscalPeriodId: invoice.fiscalPeriodId,
                referenceType: 'invoice_cancellation',
                referenceId: invoice.id,
                description: `Reversal of invoice ${invoice.number}`,
                exchangeRate,
                userId,
                lines: reversalLines,
            });

            return tx.invoice.update({
                where: { id: invoiceId },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
                include: { invoiceType: true, lines: true },
            });
        });
```

Delete the now-unused `receivableAccountId` / `payableAccountId` / `netAmount` locals and the `settings` fetch in `cancelInvoice` if they become orphaned (the reversal no longer needs them). Keep `settings` only if still referenced.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @devloggers/api test -- invoice-posting.service`
Expected: PASS (3 tests: two existing cancel tests + the new reversal-source test).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts apps/api/src/modules/invoicing/invoices/invoice-posting.service.spec.ts
git commit -m "feat(invoicing): reverse invoice cancellation from original journal entry"
```

---

### Task 9: Stock-count variance journal entry + unitCost fix (TDD)

Posting a stock count now values movements at `averageCost` (not `0`) and writes a single balanced variance JE inside the same transaction as the movements and the status update, guarded by the fiscal period.

**Files:**
- Modify: `apps/api/src/modules/inventory/stock-counts/stock-counts.service.ts`
- Modify: `apps/api/src/modules/inventory/stock-counts/repositories/stock-counts.repository.ts` (include period status)
- Test: `apps/api/src/modules/inventory/stock-counts/stock-counts.service.spec.ts` (create)

**Interfaces:**
- Consumes: `buildStockCountVarianceLines` (Task 4), `InventoryService.postMovementTx` (Task 6), `assertFiscalPeriodOpen` (Task 3), `FinancialSettingsService.getOrThrow`, `createPostingJournalEntry`.
- Requires: `StockCountsService` constructor gains `FinancialSettingsService`. Register it in the module providers.

- [ ] **Step 1: Add `fiscalPeriod` status to the repository `findById` include**

In `stock-counts.repository.ts`, change the `findById` include to add:

```ts
                fiscalPeriod: { select: { status: true } },
```

- [ ] **Step 2: Write the failing test**

```ts
import { StockCountsService } from './stock-counts.service';

function build(settings = { defaultInventoryAccountId: 'inv', defaultInventoryAdjustmentAccountId: 'adj' }) {
    const tx = {
        stockMovement: { create: jest.fn() }, stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'b', quantity: 5, averageCost: 10 }), create: jest.fn(), update: jest.fn() },
        journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je' }) },
        chartOfAccount: { findUnique: jest.fn().mockResolvedValue({ type: 'ASSET' }), update: jest.fn() },
        stockCount: { update: jest.fn().mockResolvedValue({ id: 'sc', lines: [], warehouse: {} }) },
    };
    const prisma = { item: { findMany: jest.fn().mockResolvedValue([{ id: 'i1', itemType: 'product' }]) }, $transaction: jest.fn((cb: any) => cb(tx)) } as any;
    const inventory = { postMovementTx: jest.fn() } as any;
    const seq = { getNextNumber: jest.fn().mockResolvedValue('JE-1') } as any;
    const repo = { findById: jest.fn() } as any;
    const presenter = { toDetailResponse: jest.fn((x) => x) } as any;
    const emitter = { emit: jest.fn() } as any;
    const fs = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    const svc = new StockCountsService(prisma, inventory, seq, repo, presenter, emitter, fs);
    return { svc, prisma, tx, inventory, repo };
}

describe('StockCountsService.post', () => {
    it('values the movement at averageCost and posts a variance JE', async () => {
        const { svc, tx, inventory, repo } = build();
        repo.findById.mockResolvedValue({
            id: 'sc', number: 'SC1', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp',
            fiscalPeriod: { status: 'OPEN' }, lines: [{ itemId: 'i1', difference: 3 }],
        });
        await svc.post('t', 'sc', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'STOCK_COUNT', quantity: 3, unitCost: 10 }));
        const lines = tx.journalEntry.create.mock.calls[0][0].data.lines.create;
        // surplus 3 * 10 = 30 => DR inv 30 / CR adj 30
        expect(lines).toEqual(expect.arrayContaining([
            expect.objectContaining({ accountId: 'inv', debit: 30 }),
            expect.objectContaining({ accountId: 'adj', credit: 30 }),
        ]));
    });

    it('rejects posting to a LOCKED period', async () => {
        const { svc, repo } = build();
        repo.findById.mockResolvedValue({ id: 'sc', status: 'DRAFT', fiscalPeriod: { status: 'LOCKED' }, lines: [] });
        await expect(svc.post('t', 'sc', 'u')).rejects.toThrow(/locked/i);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- stock-counts.service`
Expected: FAIL (constructor arity; no JE; unitCost 0).

- [ ] **Step 4: Rewrite `StockCountsService.post` + constructor**

Add imports:

```ts
import { FinancialSettingsService } from '../../accounting/financial-settings/services/financial-settings.service';
import { createPostingJournalEntry } from '../../accounting/accounts/utils/create-posting-journal-entry';
import { buildStockCountVarianceLines } from '../../accounting/accounts/utils/inventory-journal';
import { assertFiscalPeriodOpen } from '../../accounting/accounts/utils/assert-period-open';
```

Add `private readonly financialSettingsService: FinancialSettingsService,` to the constructor parameters.

Replace the `post` method with:

```ts
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

        const settings = await this.financialSettingsService.getOrThrow(tenantId);
        if (!settings.defaultInventoryAccountId || !settings.defaultInventoryAdjustmentAccountId) {
            throw new BadRequestException('No default Inventory / Inventory-Adjustment account configured in Financial Settings.');
        }

        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

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
                await this.inventoryService.postMovementTx(tx as any, {
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
                await createPostingJournalEntry(tx as any, {
                    tenantId,
                    number: jeNumber,
                    date: new Date(),
                    fiscalPeriodId: stockCount.fiscalPeriodId,
                    referenceType: 'stock_count',
                    referenceId: id,
                    description: `Stock count variance ${stockCount.number}`,
                    exchangeRate: 1,
                    userId,
                    lines: buildStockCountVarianceLines({
                        inventoryAccountId: settings.defaultInventoryAccountId!,
                        adjustmentAccountId: settings.defaultInventoryAdjustmentAccountId!,
                        netAmount: netVariance,
                    }),
                });
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

- [ ] **Step 5: Register `FinancialSettingsService` in the stock-counts module**

In `apps/api/src/modules/inventory/stock-counts/stock-counts.module.ts`, import the `FinancialSettingsModule` (or add `FinancialSettingsService` to providers if that module exports it). Verify by grepping how `InvoicePostingService`'s module wires it and mirror that.

- [ ] **Step 6: Run tests + build**

Run: `pnpm --filter @devloggers/api test -- stock-counts.service`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/inventory/stock-counts
git commit -m "feat(inventory): post stock-count variance journal entry at averageCost"
```

---

### Task 10: Opening-balance journal entry (TDD)

Registering opening balances now posts a single `DR Inventory / CR Opening Balance Equity` journal entry, atomically with the movements.

**Files:**
- Modify: `apps/api/src/modules/inventory/inventory.service.ts`
- Modify: `apps/api/src/modules/inventory/inventory.module.ts` (wire `FinancialSettingsService` + `DocumentSequencesService`)
- Test: `apps/api/src/modules/inventory/inventory.opening.spec.ts` (create)

**Interfaces:**
- Consumes: `buildOpeningBalanceLines` (Task 4), `createPostingJournalEntry`, `FinancialSettingsService.getOrThrow`, `DocumentSequencesService.getNextNumber`, `postMovementTx` (Task 6).
- Requires: `InventoryService` constructor gains `FinancialSettingsService` + `DocumentSequencesService`. `registerOpeningBalance` returns `{ count, warehouseId, journalEntryId }`.

- [ ] **Step 1: Write the failing test**

```ts
import { InventoryService } from './inventory.service';

describe('InventoryService.registerOpeningBalance', () => {
    it('posts movements and a DR Inventory / CR Opening Equity entry', async () => {
        const tx = {
            stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
            stockBalance: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
            journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je-open' }) },
            chartOfAccount: { findUnique: jest.fn().mockResolvedValue({ type: 'ASSET' }), update: jest.fn() },
        };
        const prisma = { $transaction: jest.fn((cb: any) => cb(tx)) } as any;
        const fs = { getOrThrow: jest.fn().mockResolvedValue({ defaultInventoryAccountId: 'inv', defaultOpeningEquityAccountId: 'oe' }) } as any;
        const seq = { getNextNumber: jest.fn().mockResolvedValue('JE-1') } as any;
        const svc = new InventoryService(prisma, {} as any, {} as any, fs, seq);

        const res = await svc.registerOpeningBalance('t', 'u', {
            warehouseId: 'w1', fiscalPeriodId: 'fp',
            items: [{ itemId: 'i1', quantity: 10, unitCost: 6 }, { itemId: 'i2', quantity: 20, unitCost: 3 }],
        } as any);

        const lines = tx.journalEntry.create.mock.calls[0][0].data.lines.create;
        // 10*6 + 20*3 = 120
        expect(lines).toEqual(expect.arrayContaining([
            expect.objectContaining({ accountId: 'inv', debit: 120 }),
            expect.objectContaining({ accountId: 'oe', credit: 120 }),
        ]));
        expect(res).toMatchObject({ count: 2, warehouseId: 'w1', journalEntryId: 'je-open' });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- inventory.opening`
Expected: FAIL (constructor arity; no JE created).

- [ ] **Step 3: Rewrite `registerOpeningBalance` + constructor**

Add imports:

```ts
import { FinancialSettingsService } from '../accounting/financial-settings/services/financial-settings.service';
import { DocumentSequencesService } from '../accounting/document-sequences/services/document-sequences.service';
import { createPostingJournalEntry } from '../accounting/accounts/utils/create-posting-journal-entry';
import { buildOpeningBalanceLines } from '../accounting/accounts/utils/inventory-journal';
```

Add to the constructor params: `private readonly financialSettingsService: FinancialSettingsService, private readonly docSeqService: DocumentSequencesService,`.

Replace `registerOpeningBalance`:

```ts
    async registerOpeningBalance(tenantId: string, userId: string, dto: PostOpeningBalanceDto) {
        const settings = await this.financialSettingsService.getOrThrow(tenantId);
        if (!settings.defaultInventoryAccountId || !settings.defaultOpeningEquityAccountId) {
            throw new BadRequestException('No default Inventory / Opening-Equity account configured in Financial Settings.');
        }
        const totalValue = dto.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
        const jeNumber = await this.docSeqService.getNextNumber(tenantId, 'JOURNAL_ENTRY');

        return this.prisma.$transaction(async (tx) => {
            for (const item of dto.items) {
                await this.postMovementTx(tx as unknown as InventoryTx, {
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
                const entry = await createPostingJournalEntry(tx as any, {
                    tenantId,
                    number: jeNumber,
                    date: new Date(),
                    fiscalPeriodId: dto.fiscalPeriodId,
                    referenceType: 'opening_balance',
                    referenceId: dto.warehouseId,
                    description: 'Opening inventory balance',
                    exchangeRate: 1,
                    userId,
                    lines: buildOpeningBalanceLines({
                        inventoryAccountId: settings.defaultInventoryAccountId!,
                        openingEquityAccountId: settings.defaultOpeningEquityAccountId!,
                        amount: totalValue,
                    }),
                });
                journalEntryId = entry.id;
            }

            return { count: dto.items.length, warehouseId: dto.warehouseId, journalEntryId };
        });
    }
```

- [ ] **Step 4: Wire the new deps in `inventory.module.ts`**

Ensure `FinancialSettingsModule` and the accounting module providing `DocumentSequencesService` are imported/exported so DI resolves. Mirror `InvoicePostingService`'s module wiring (grep for how `invoices.module.ts` imports `FinancialSettingsService` and `DocumentSequencesService`).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- inventory.opening`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/inventory/inventory.service.ts apps/api/src/modules/inventory/inventory.module.ts apps/api/src/modules/inventory/inventory.opening.spec.ts
git commit -m "feat(inventory): post opening-balance journal entry (DR Inventory / CR Opening Equity)"
```

---

### Task 11: Full verification & DI smoke build

Confirms the whole slice compiles, all new tests pass, DI wiring is valid, and OpenAPI types are current.

**Files:** none (verification only).

- [ ] **Step 1: Run the full API test suite**

Run: `pnpm --filter @devloggers/api test`
Expected: PASS — all suites, including the four cross-cutting concerns (COGS, capitalization, variance, opening) and the existing invoice/payment/expense specs.

- [ ] **Step 2: Regenerate OpenAPI types (validates DI bootstraps without the HTTP server/DB)**

Run: `pnpm generate`
Expected: succeeds — `generate:spec` bootstraps every module (so a missing provider for `FinancialSettingsService` / `DocumentSequencesService` in `InventoryModule` or `StockCountsModule` surfaces here as a Nest DI error). `packages/api-contracts` rebuilds.

- [ ] **Step 3: Type-check the affected packages**

Run: `pnpm turbo run build --filter=@devloggers/api`
Expected: succeeds with no `as any`-driven type errors.

- [ ] **Step 4: Commit any generated artifacts**

```bash
git add apps/api/openapi.yaml packages/api-contracts/types
git commit -m "chore(accounting): regenerate OpenAPI types for perpetual GL integration" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage** (each spec item → task):
- Perpetual method / new FS fields / dedicated accounts → Tasks 1–2. ✅
- A. Purchase capitalize → Tasks 5, 7. ✅
- B. Sales COGS → Tasks 4, 7. ✅
- C. Cancel reverses COGS/Inventory from original JE → Task 8. ✅
- D. Stock-count variance + `unitCost:0` fix → Tasks 4, 9. ✅
- E. Opening-balance JE → Tasks 4, 10. ✅
- Payment allocate = no JE → unchanged; explicitly out of scope, no task (documented in spec §5). ✅
- Cross-cutting #1 atomicity → Tasks 6, 7, 8, 9, 10. ✅
- #2 fiscal-period lock → Tasks 3, 7, 8, 9. ✅
- #3 currency (no rate on COGS/inventory; base capitalization) → encoded in Tasks 4, 5, 7. ✅
- #4 GL↔ledger invariant → same cost number feeds `postMovementTx` and the JE (Tasks 7, 9, 10). ✅
- #5 reversal integrity → Task 8. ✅
- #6 migration deferral → Task 1. ✅

**Placeholder scan:** no TBD/"handle errors"/"similar to"; every code step shows full code. ✅

**Type consistency:** `postMovementTx(tx, params)`, `InventoryTx`, `buildCogsJournalLines`/`buildStockCountVarianceLines`/`buildOpeningBalanceLines`, `assertFiscalPeriodOpen`, and the `inventoryAmount`/`inventoryAccountId` additions are named identically across defining and consuming tasks. ✅

**Open verification note for the implementer:** Tasks 9 & 10 add constructor dependencies (`FinancialSettingsService`, `DocumentSequencesService`) to services whose modules may not currently import the providing modules. Step 2 of Task 11 (`pnpm generate`) is the gate that catches any missing DI wiring — do not skip it.
