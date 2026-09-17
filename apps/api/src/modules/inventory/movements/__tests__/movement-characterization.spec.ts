import { InvoicePostingService } from '../../../invoicing/invoices/invoice-posting.service';
import { StockCountsService } from '../../stock-counts/stock-counts.service';
import { InventoryService } from '../../inventory.service';
import { createFakeInventoryTx, movementRows, balanceRows } from './fake-inventory-tx';
import { buildMovementFacade } from './build-movement-facade';

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
    return new InventoryService({} as any, {} as any, {} as any, postingFacade as any, buildMovementFacade());
}

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
