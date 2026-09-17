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
        expect(result).toEqual({ movementIds: [fake.state.movements[0]?.id], valueDelta: 200 });
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
