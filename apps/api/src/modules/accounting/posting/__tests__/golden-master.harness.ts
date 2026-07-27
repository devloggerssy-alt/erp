/**
 * Phase 0.1 — golden-master harness.
 *
 * Records every `journalEntry.create` payload produced by a real posting path,
 * with the database replaced by in-memory doubles. Phase 1 moves GL policy into
 * `accounting/posting/policies/`; these captures are the evidence that the move
 * changed nothing.
 *
 * Deliberately NOT jest snapshots: `jest -u` would silently rewrite the very
 * thing this suite exists to hold still. Expectations are explicit `toEqual`
 * objects, so changing one is a visible, reviewable diff.
 *
 * Spec: docs/superpowers/specs/2026-07-25-architecture-refactor/phase-0-guardrails.md
 */

// ── Fixture ids ──────────────────────────────────────────────────────────────
// Readable rather than uuid-shaped: a failing diff should say "acct:ar", not a guid.

export const ACC = {
    receivable: 'acct:ar',
    payable: 'acct:ap',
    sales: 'acct:sales',
    purchase: 'acct:purchase',
    tax: 'acct:tax',
    inventory: 'acct:inventory',
    cogs: 'acct:cogs',
    inventoryAdjustment: 'acct:inv-adj',
    openingEquity: 'acct:opening-equity',
    cashbox: 'acct:cashbox',
    partyReceivable: 'acct:party-ar',
    partyPayable: 'acct:party-ap',
    expenseRent: 'acct:exp-rent',
    expenseUtilities: 'acct:exp-utilities',
} as const;

export const TENANT = 'tenant-1';
export const USER = 'user-1';
export const PARTY = 'party-1';
export const PERIOD = 'period-1';
export const WAREHOUSE = 'warehouse-1';
export const JE_NUMBER = 'JE-000001';

/** Every fixture account is postable and live, so JournalPostingService validation passes. */
const ACCOUNT_ROWS = Object.values(ACC).map((id) => ({
    id,
    code: id.replace('acct:', ''),
    type: 'ASSET',
    isPostable: true,
    isContra: false,
    deletedAt: null,
}));

export const SETTINGS = {
    defaultReceivableAccountId: ACC.receivable,
    defaultPayableAccountId: ACC.payable,
    defaultSalesAccountId: ACC.sales,
    defaultPurchaseAccountId: ACC.purchase,
    defaultTaxAccountId: ACC.tax,
    defaultInventoryAccountId: ACC.inventory,
    defaultCogsAccountId: ACC.cogs,
    defaultInventoryAdjustmentAccountId: ACC.inventoryAdjustment,
    defaultOpeningEquityAccountId: ACC.openingEquity,
};

// ── Captured shape ───────────────────────────────────────────────────────────

export interface CapturedLine {
    accountId: string;
    debit: number;
    credit: number;
    description: string | null;
    sortOrder: number;
    partyId: string | null;
}

export interface CapturedEntry {
    number: string;
    referenceType: string;
    referenceId: string;
    description: string;
    status: string;
    exchangeRate: number;
    reversalOfId: string | null;
    lines: CapturedLine[];
}

/**
 * Strip non-deterministic fields (`postedAt`, `date`, generated ids) and sort
 * lines by sortOrder so the comparison is stable across runs.
 */
function normalize(data: Record<string, any>): CapturedEntry {
    const rawLines: Record<string, any>[] = data.lines?.create ?? [];
    return {
        number: data.number,
        referenceType: String(data.referenceType),
        referenceId: data.referenceId,
        description: data.description,
        status: data.status,
        exchangeRate: Number(data.exchangeRate),
        reversalOfId: data.reversalOfId ?? null,
        lines: [...rawLines]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((l) => ({
                accountId: l.accountId,
                debit: Number(l.debit),
                credit: Number(l.credit),
                description: l.description ?? null,
                sortOrder: l.sortOrder,
                partyId: l.partyId ?? null,
            })),
    };
}

// ── Transaction double ───────────────────────────────────────────────────────

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

export interface Capture {
    /** Every journal entry created, in creation order. */
    entries: CapturedEntry[];
    /** The single entry, asserting exactly one was created. */
    only(): CapturedEntry;
    tx: Record<string, any>;
}

export function createCapture(options: TxOptions = {}): Capture {
    const entries: CapturedEntry[] = [];
    let seq = 0;

    const noop = async () => ({});

    const tx: Record<string, any> = {
        chartOfAccount: {
            findMany: async ({ where }: any) => {
                const ids: string[] = where?.id?.in ?? [];
                return ACCOUNT_ROWS.filter((a) => ids.includes(a.id));
            },
        },
        journalEntry: {
            create: async ({ data }: any) => {
                entries.push(normalize(data));
                return { id: `je-${++seq}` };
            },
            findFirst: async () => {
                if (!options.originalEntry) return null;
                return {
                    id: options.originalEntry.id,
                    lines: options.originalEntry.lines,
                };
            },
        },
        stockBalance: {
            findUnique: async ({ where }: any) => {
                const itemId = where?.tenantId_warehouseId_itemId?.itemId;
                const row = itemId ? options.stockBalances?.[itemId] : undefined;
                return row ?? null;
            },
            upsert: noop,
            update: noop,
        },
        stockMovement: {
            findMany: async () => options.stockMovements ?? [],
            create: noop,
        },
        party: {
            findFirst: async () => options.partyOverride ?? null,
        },
        invoice: { update: async ({ data }: any) => ({ ...data }) },
        payment: { update: async ({ data }: any) => ({ ...data }) },
        expense: { update: async ({ data }: any) => ({ ...data }) },
        stockCount: { update: async ({ data }: any) => ({ ...data }) },
        cashbox: { update: noop },
        item: { update: noop },
        chartOfAccountUpdate: noop,
    };

    return {
        entries,
        only() {
            if (entries.length !== 1) {
                throw new Error(`Expected exactly 1 journal entry, captured ${entries.length}`);
            }
            return entries[0]!;
        },
        tx,
    };
}

// ── Service doubles ──────────────────────────────────────────────────────────

/** A PrismaService whose `$transaction` runs inline against the capture's tx. */
export function fakePrisma(capture: Capture, reads: Record<string, any> = {}): any {
    return {
        ...capture.tx,
        ...reads,
        $transaction: async (fn: (tx: any) => Promise<unknown>) => fn(capture.tx),
    };
}

export const fakeDocSeq = { getNextNumber: async () => JE_NUMBER } as any;

export function fakeFinancialSettings(overrides: Partial<typeof SETTINGS> = {}): any {
    return { getOrThrow: async () => ({ ...SETTINGS, ...overrides }) };
}

/** Inventory movements are Phase 3's concern; here they only need to not explode. */
export const fakeInventory = { postMovementTx: async () => ({}) } as any;

// ── Shared invariant ─────────────────────────────────────────────────────────

/**
 * Double-entry invariant from `.ai/rules/domain.md` §2. Asserted on every
 * captured entry in every test, independently of the expected line list — so a
 * mistake in an *expectation* still cannot let an unbalanced entry through.
 */
export function expectBalanced(entry: CapturedEntry): void {
    const debit = entry.lines.reduce((s, l) => s + l.debit, 0);
    const credit = entry.lines.reduce((s, l) => s + l.credit, 0);
    expect(Number(debit.toFixed(4))).toBe(Number(credit.toFixed(4)));
}

// ── Facade double ────────────────────────────────────────────────────────────

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
