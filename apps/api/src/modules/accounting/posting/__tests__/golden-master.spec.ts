/**
 * Phase 0.1 — golden-master characterization suite.
 *
 * ⚠️  DO NOT UPDATE THESE EXPECTATIONS DURING PHASE 1.  ⚠️
 *
 * Phase 1 moves GL account resolution and journal-line construction out of the
 * six calling services and into `accounting/posting/policies/`. It is a
 * behaviour-preserving refactor by construction, so every expectation below
 * must still hold afterwards. A failure here means the refactor changed what
 * gets posted to the ledger — investigate, do not re-baseline.
 *
 * If a change is genuinely intended, it belongs in its own PR with its own
 * accounting review, separate from the refactor.
 *
 * Spec: docs/superpowers/specs/2026-07-25-architecture-refactor/phase-0-guardrails.md
 */
import { InvoicePostingService } from '../../../invoicing/invoices/invoice-posting.service';
import { PaymentsService } from '../../../invoicing/payments/payments.service';
import { ExpensesService } from '../../../invoicing/expenses/expenses.service';
import { PaymentsRepository } from '../../../invoicing/payments/repositories/payments.repository';
import { PaymentPresenter } from '../../../invoicing/payments/presenters/payment.presenter';
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

// ── Fixture builders ─────────────────────────────────────────────────────────

function invoiceFixture(overrides: Record<string, any> = {}) {
    return {
        id: 'invoice-1',
        number: 'INV-001',
        status: 'DRAFT',
        date: new Date('2026-03-01T00:00:00.000Z'),
        partyId: PARTY,
        warehouseId: WAREHOUSE,
        fiscalPeriodId: PERIOD,
        exchangeRate: 1,
        subtotal: 1000,
        discountAmount: 0,
        taxAmount: 0,
        total: 1000,
        invoiceType: { direction: 'PURCHASE', affectsStock: true },
        party: {},
        fiscalPeriod: { status: 'OPEN' },
        paymentAllocations: [],
        lines: [
            {
                itemId: 'item-1',
                quantity: 10,
                unitPrice: 100,
                total: 1000,
                taxAmount: 0,
                item: { itemType: 'product' },
            },
        ],
        ...overrides,
    };
}

function buildInvoicePosting(capture: ReturnType<typeof createCapture>, invoice: Record<string, any>, settings = {}) {
    const prisma = fakePrisma(capture, {
        invoice: { ...capture.tx.invoice, findFirst: async () => invoice },
        journalEntry: { ...capture.tx.journalEntry },
    });
    return new InvoicePostingService(prisma, fakeInventory, fakePostingFacade(settings));
}

// =============================================================================
// 1 — PURCHASE INVOICE
// =============================================================================

describe('golden master: purchase invoice', () => {
    it('capitalises stock lines to Inventory and credits Payable for the total', async () => {
        const capture = createCapture();
        const service = buildInvoicePosting(capture, invoiceFixture());

        await service.postPurchaseInvoice(TENANT, 'invoice-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry).toEqual<CapturedEntry>({
            number: JE_NUMBER,
            referenceType: 'INVOICE',
            referenceId: 'invoice-1',
            description: 'Purchase invoice INV-001',
            status: 'POSTED',
            exchangeRate: 1,
            reversalOfId: null,
            lines: [
                { accountId: ACC.inventory, debit: 1000, credit: 0, description: null, sortOrder: 0, partyId: null },
                { accountId: ACC.payable, debit: 0, credit: 1000, description: null, sortOrder: 1, partyId: PARTY },
            ],
        });
    });

    it('with tax: Inventory + Input Tax debited, Payable credited the gross', async () => {
        const capture = createCapture();
        const service = buildInvoicePosting(
            capture,
            invoiceFixture({
                taxAmount: 150,
                total: 1150,
                lines: [
                    {
                        itemId: 'item-1', quantity: 10, unitPrice: 100,
                        total: 1150, taxAmount: 150, item: { itemType: 'product' },
                    },
                ],
            }),
        );

        await service.postPurchaseInvoice(TENANT, 'invoice-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.lines).toEqual([
            { accountId: ACC.inventory, debit: 1000, credit: 0, description: null, sortOrder: 0, partyId: null },
            { accountId: ACC.tax, debit: 150, credit: 0, description: null, sortOrder: 1, partyId: null },
            { accountId: ACC.payable, debit: 0, credit: 1150, description: null, sortOrder: 2, partyId: PARTY },
        ]);
    });

    it('service-only lines go to Purchase expense, not Inventory', async () => {
        const capture = createCapture();
        const service = buildInvoicePosting(
            capture,
            invoiceFixture({
                lines: [
                    {
                        itemId: 'item-svc', quantity: 1, unitPrice: 1000,
                        total: 1000, taxAmount: 0, item: { itemType: 'service' },
                    },
                ],
            }),
        );

        await service.postPurchaseInvoice(TENANT, 'invoice-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.lines).toEqual([
            { accountId: ACC.purchase, debit: 1000, credit: 0, description: null, sortOrder: 0, partyId: null },
            { accountId: ACC.payable, debit: 0, credit: 1000, description: null, sortOrder: 1, partyId: PARTY },
        ]);
    });

    it('party-level payable account overrides the tenant default', async () => {
        const capture = createCapture({ partyOverride: { payableAccountId: ACC.partyPayable } });
        const service = buildInvoicePosting(capture, invoiceFixture());

        await service.postPurchaseInvoice(TENANT, 'invoice-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.lines.at(-1)).toEqual({
            accountId: ACC.partyPayable, debit: 0, credit: 1000,
            description: null, sortOrder: 1, partyId: PARTY,
        });
    });

    it('applies the exchange rate to every leg', async () => {
        const capture = createCapture();
        const service = buildInvoicePosting(capture, invoiceFixture({ exchangeRate: 2.5 }));

        await service.postPurchaseInvoice(TENANT, 'invoice-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.exchangeRate).toBe(2.5);
        expect(entry.lines).toEqual([
            { accountId: ACC.inventory, debit: 2500, credit: 0, description: null, sortOrder: 0, partyId: null },
            { accountId: ACC.payable, debit: 0, credit: 2500, description: null, sortOrder: 1, partyId: PARTY },
        ]);
    });
});

// =============================================================================
// 2 — SALES INVOICE (incl. COGS)
// =============================================================================

describe('golden master: sales invoice', () => {
    const salesInvoice = (overrides: Record<string, any> = {}) =>
        invoiceFixture({
            number: 'INV-S01',
            invoiceType: { direction: 'SALE', affectsStock: true },
            party: {},
            ...overrides,
        });

    it('posts revenue and the COGS leg at average cost', async () => {
        const capture = createCapture({
            stockBalances: { 'item-1': { quantity: 50, averageCost: 60 } },
        });
        const service = buildInvoicePosting(capture, salesInvoice());

        await service.postSalesInvoice(TENANT, 'invoice-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry).toEqual<CapturedEntry>({
            number: JE_NUMBER,
            referenceType: 'INVOICE',
            referenceId: 'invoice-1',
            description: 'Sales invoice INV-S01',
            status: 'POSTED',
            exchangeRate: 1,
            reversalOfId: null,
            lines: [
                { accountId: ACC.receivable, debit: 1000, credit: 0, description: null, sortOrder: 0, partyId: PARTY },
                { accountId: ACC.sales, debit: 0, credit: 1000, description: null, sortOrder: 1, partyId: null },
                // COGS legs are appended after the revenue legs — 10 units × 60 average cost.
                { accountId: ACC.cogs, debit: 600, credit: 0, description: null, sortOrder: 2, partyId: null },
                { accountId: ACC.inventory, debit: 0, credit: 600, description: null, sortOrder: 3, partyId: null },
            ],
        });
    });

    it('service-only sale has no COGS leg', async () => {
        const capture = createCapture();
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

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.lines).toHaveLength(2);
        expect(entry.lines.map((l) => l.accountId)).toEqual([ACC.receivable, ACC.sales]);
    });

    it('zero-cost stock produces no COGS leg', async () => {
        const capture = createCapture({
            stockBalances: { 'item-1': { quantity: 50, averageCost: 0 } },
        });
        const service = buildInvoicePosting(capture, salesInvoice());

        await service.postSalesInvoice(TENANT, 'invoice-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.lines).toHaveLength(2);
    });

    it('with tax: Tax Payable is credited alongside revenue', async () => {
        const capture = createCapture({
            stockBalances: { 'item-1': { quantity: 50, averageCost: 60 } },
        });
        const service = buildInvoicePosting(
            capture,
            salesInvoice({ taxAmount: 150, total: 1150 }),
        );

        await service.postSalesInvoice(TENANT, 'invoice-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.lines.slice(0, 3)).toEqual([
            { accountId: ACC.receivable, debit: 1150, credit: 0, description: null, sortOrder: 0, partyId: PARTY },
            { accountId: ACC.sales, debit: 0, credit: 1000, description: null, sortOrder: 1, partyId: null },
            { accountId: ACC.tax, debit: 0, credit: 150, description: null, sortOrder: 2, partyId: null },
        ]);
    });

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
});

// =============================================================================
// 3 — INVOICE CANCELLATION
// =============================================================================

describe('golden master: invoice cancellation', () => {
    it('mirrors the original entry leg for leg', async () => {
        const original = {
            id: 'je-original',
            lines: [
                { accountId: ACC.inventory, debit: 1000, credit: 0, description: null, sortOrder: 0, partyId: null },
                { accountId: ACC.payable, debit: 0, credit: 1000, description: null, sortOrder: 1, partyId: PARTY },
            ],
        };
        const capture = createCapture({ originalEntry: original, stockMovements: [] });
        const prisma = fakePrisma(capture, {
            invoice: { ...capture.tx.invoice, findFirst: async () => invoiceFixture({ status: 'POSTED' }) },
            journalEntry: { ...capture.tx.journalEntry, findFirst: async () => original },
        });
        const service = new InvoicePostingService(prisma, fakeInventory, fakePostingFacade());

        await service.cancelInvoice(TENANT, 'invoice-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.referenceType).toBe('INVOICE_CANCELLATION');
        expect(entry.reversalOfId).toBe('je-original');
        expect(entry.description).toBe('Reversal of invoice INV-001');
        // Debit and credit swap; account, sortOrder and partyId are preserved.
        expect(entry.lines).toEqual([
            { accountId: ACC.inventory, debit: 0, credit: 1000, description: null, sortOrder: 0, partyId: null },
            { accountId: ACC.payable, debit: 1000, credit: 0, description: null, sortOrder: 1, partyId: PARTY },
        ]);
    });
});

// =============================================================================
// 4 & 5 — PAYMENT + PAYMENT CANCELLATION
// =============================================================================

describe('golden master: payment', () => {
    const paymentFixture = (overrides: Record<string, any> = {}) => ({
        id: 'payment-1',
        number: 'PAY-001',
        status: 'DRAFT',
        type: 'RECEIPT',
        date: new Date('2026-03-02T00:00:00.000Z'),
        cashboxId: 'cashbox-1',
        partyId: PARTY,
        fiscalPeriodId: PERIOD,
        exchangeRate: 1,
        amount: 500,
        allocatedAmount: 0,
        party: {},
        fiscalPeriod: { status: 'OPEN' },
        createdAt: new Date('2026-03-02T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
        ...overrides,
    });

    function buildPayments(capture: ReturnType<typeof createCapture>, payment: Record<string, any>) {
        const prisma = fakePrisma(capture, {
            payment: { ...capture.tx.payment, findFirst: async () => payment },
            cashbox: { ...capture.tx.cashbox, findUnique: async () => ({ linkedAccountId: ACC.cashbox }) },
            journalEntry: { ...capture.tx.journalEntry, findFirst: async () => ({ id: 'je-original' }) },
        });
        return new PaymentsService(
            new PaymentsRepository(prisma),
            new PaymentPresenter(),
            fakeDocSeq,
            prisma,
            fakePostingFacade(),
        );
    }

    it('RECEIPT: debits Cashbox, credits Receivable with the party on the AR leg', async () => {
        const capture = createCapture();
        await buildPayments(capture, paymentFixture()).post(TENANT, 'payment-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry).toEqual<CapturedEntry>({
            number: JE_NUMBER,
            referenceType: 'PAYMENT',
            referenceId: 'payment-1',
            description: 'Payment PAY-001',
            status: 'POSTED',
            exchangeRate: 1,
            reversalOfId: null,
            lines: [
                { accountId: ACC.cashbox, debit: 500, credit: 0, description: null, sortOrder: 0, partyId: null },
                { accountId: ACC.receivable, debit: 0, credit: 500, description: null, sortOrder: 1, partyId: PARTY },
            ],
        });
    });

    it('PAYMENT: debits Payable (party on the AP leg), credits Cashbox', async () => {
        const capture = createCapture();
        await buildPayments(capture, paymentFixture({ type: 'PAYMENT' })).post(TENANT, 'payment-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.lines).toEqual([
            { accountId: ACC.payable, debit: 500, credit: 0, description: null, sortOrder: 0, partyId: PARTY },
            { accountId: ACC.cashbox, debit: 0, credit: 500, description: null, sortOrder: 1, partyId: null },
        ]);
    });

    it('party-level receivable account overrides the tenant default', async () => {
        const capture = createCapture({ partyOverride: { receivableAccountId: ACC.partyReceivable } });
        await buildPayments(capture, paymentFixture()).post(TENANT, 'payment-1', USER);

        expect(capture.only().lines[1]!.accountId).toBe(ACC.partyReceivable);
    });

    it('applies the exchange rate', async () => {
        const capture = createCapture();
        await buildPayments(capture, paymentFixture({ exchangeRate: 3 })).post(TENANT, 'payment-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.lines.map((l) => l.debit + l.credit)).toEqual([1500, 1500]);
    });

    it('cancellation mirrors the original', async () => {
        const original = {
            id: 'je-original',
            lines: [
                { accountId: ACC.cashbox, debit: 500, credit: 0, description: null, sortOrder: 0, partyId: null },
                { accountId: ACC.receivable, debit: 0, credit: 500, description: null, sortOrder: 1, partyId: PARTY },
            ],
        };
        const capture = createCapture({ originalEntry: original });
        const prisma = fakePrisma(capture, {
            payment: { ...capture.tx.payment, findFirst: async () => paymentFixture({ status: 'POSTED' }) },
            cashbox: { ...capture.tx.cashbox, findUnique: async () => ({ linkedAccountId: ACC.cashbox }) },
            journalEntry: { ...capture.tx.journalEntry, findFirst: async () => original },
        });
        const service = new PaymentsService(
            new PaymentsRepository(prisma),
            new PaymentPresenter(),
            fakeDocSeq,
            prisma,
            fakePostingFacade(),
        );

        await service.cancel(TENANT, 'payment-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.referenceType).toBe('PAYMENT_CANCELLATION');
        expect(entry.reversalOfId).toBe('je-original');
        expect(entry.lines).toEqual([
            { accountId: ACC.cashbox, debit: 0, credit: 500, description: null, sortOrder: 0, partyId: null },
            { accountId: ACC.receivable, debit: 500, credit: 0, description: null, sortOrder: 1, partyId: PARTY },
        ]);
    });
});

// =============================================================================
// 6 & 7 — EXPENSE + EXPENSE CANCELLATION
// =============================================================================

describe('golden master: expense', () => {
    const expenseFixture = (overrides: Record<string, any> = {}) => ({
        id: 'expense-1',
        number: 'EXP-001',
        status: 'DRAFT',
        date: new Date('2026-03-03T00:00:00.000Z'),
        cashboxId: 'cashbox-1',
        fiscalPeriodId: PERIOD,
        exchangeRate: 1,
        totalAmount: 300,
        cashbox: { linkedAccountId: ACC.cashbox },
        fiscalPeriod: { status: 'OPEN' },
        items: [
            { accountId: ACC.expenseRent, amount: 200, description: 'Rent', sortOrder: 0 },
            { accountId: ACC.expenseUtilities, amount: 100, description: 'Utilities', sortOrder: 1 },
        ],
        ...overrides,
    });

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

    it('debits each item account and credits the cashbox for the total', async () => {
        const capture = createCapture();
        await buildExpenses(capture, expenseFixture()).post(TENANT, 'expense-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry).toEqual<CapturedEntry>({
            number: JE_NUMBER,
            referenceType: 'EXPENSE',
            referenceId: 'expense-1',
            description: 'Expense EXP-001',
            status: 'POSTED',
            exchangeRate: 1,
            reversalOfId: null,
            lines: [
                { accountId: ACC.expenseRent, debit: 200, credit: 0, description: 'Rent', sortOrder: 0, partyId: null },
                { accountId: ACC.expenseUtilities, debit: 100, credit: 0, description: 'Utilities', sortOrder: 1, partyId: null },
                { accountId: ACC.cashbox, debit: 0, credit: 300, description: null, sortOrder: 2, partyId: null },
            ],
        });
    });

    it('applies the exchange rate to items and the cashbox leg alike', async () => {
        const capture = createCapture();
        await buildExpenses(capture, expenseFixture({ exchangeRate: 2 })).post(TENANT, 'expense-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.lines.map((l) => l.debit || l.credit)).toEqual([400, 200, 600]);
    });

    it('cancellation mirrors the original', async () => {
        const original = {
            id: 'je-original',
            lines: [
                { accountId: ACC.expenseRent, debit: 200, credit: 0, description: 'Rent', sortOrder: 0, partyId: null },
                { accountId: ACC.cashbox, debit: 0, credit: 200, description: null, sortOrder: 1, partyId: null },
            ],
        };
        const capture = createCapture({ originalEntry: original });
        const prisma = fakePrisma(capture, {
            expense: { ...capture.tx.expense, findFirst: async () => expenseFixture({ status: 'POSTED' }) },
            journalEntry: { ...capture.tx.journalEntry, findFirst: async () => original },
        });
        const service = new ExpensesService(prisma, fakeDocSeq, fakePostingFacade());

        await service.cancel(TENANT, 'expense-1', USER);

        const entry = capture.only();
        expectBalanced(entry);
        expect(entry.referenceType).toBe('EXPENSE_CANCELLATION');
        expect(entry.reversalOfId).toBe('je-original');
        expect(entry.lines).toEqual([
            { accountId: ACC.expenseRent, debit: 0, credit: 200, description: 'Rent', sortOrder: 0, partyId: null },
            { accountId: ACC.cashbox, debit: 200, credit: 0, description: null, sortOrder: 1, partyId: null },
        ]);
    });
});

// =============================================================================
// 8, 9, 10 — line builders used by stock-count variance, opening balance,
//            and opening stock.
//
// Those three call sites reach the ledger through services whose surrounding
// dependencies (repositories, i18n, DTO validation) are far heavier than the
// posting logic under test. Their *journal shape* is fully determined by the
// builders below, which Phase 1 moves verbatim into policies — so pinning the
// builders pins the ledger output for those paths.
//
// TODO(Phase 1, task 1.4.5–1.4.7): once each policy exists, add the
// service-level capture the way the paths above do, and delete this note.
// =============================================================================

describe('golden master: stock-count variance lines', () => {
    it('surplus debits Inventory, credits the adjustment account', () => {
        expect(
            buildStockCountVarianceLines({
                inventoryAccountId: ACC.inventory,
                adjustmentAccountId: ACC.inventoryAdjustment,
                netAmount: 250,
            }),
        ).toEqual([
            { accountId: ACC.inventory, debit: 250, credit: 0, description: null, sortOrder: 0 },
            { accountId: ACC.inventoryAdjustment, debit: 0, credit: 250, description: null, sortOrder: 1 },
        ]);
    });

    it('shortage reverses the sides and uses the absolute amount', () => {
        expect(
            buildStockCountVarianceLines({
                inventoryAccountId: ACC.inventory,
                adjustmentAccountId: ACC.inventoryAdjustment,
                netAmount: -250,
            }),
        ).toEqual([
            { accountId: ACC.inventory, debit: 0, credit: 250, description: null, sortOrder: 0 },
            { accountId: ACC.inventoryAdjustment, debit: 250, credit: 0, description: null, sortOrder: 1 },
        ]);
    });
});

describe('golden master: opening balance / opening stock lines', () => {
    it('debits Inventory and credits Opening Balance Equity', () => {
        expect(
            buildOpeningBalanceLines({
                inventoryAccountId: ACC.inventory,
                openingEquityAccountId: ACC.openingEquity,
                amount: 5000,
            }),
        ).toEqual([
            { accountId: ACC.inventory, debit: 5000, credit: 0, description: null, sortOrder: 0 },
            { accountId: ACC.openingEquity, debit: 0, credit: 5000, description: null, sortOrder: 1 },
        ]);
    });

    it('rounds to 4 decimal places, matching @db.Decimal(18,4)', () => {
        const [inventoryLine] = buildOpeningBalanceLines({
            inventoryAccountId: ACC.inventory,
            openingEquityAccountId: ACC.openingEquity,
            amount: 123.456789,
        });
        expect(inventoryLine!.debit).toBe(123.4568);
    });
});

describe('golden master: COGS lines', () => {
    it('debits COGS and credits Inventory', () => {
        expect(
            buildCogsJournalLines({
                cogsAccountId: ACC.cogs,
                inventoryAccountId: ACC.inventory,
                amount: 600,
            }),
        ).toEqual([
            { accountId: ACC.cogs, debit: 600, credit: 0, description: null, sortOrder: 0 },
            { accountId: ACC.inventory, debit: 0, credit: 600, description: null, sortOrder: 1 },
        ]);
    });

    it('reverse swaps the sides', () => {
        expect(
            buildCogsJournalLines(
                { cogsAccountId: ACC.cogs, inventoryAccountId: ACC.inventory, amount: 600 },
                { reverse: true },
            ),
        ).toEqual([
            { accountId: ACC.cogs, debit: 0, credit: 600, description: null, sortOrder: 0 },
            { accountId: ACC.inventory, debit: 600, credit: 0, description: null, sortOrder: 1 },
        ]);
    });
});
