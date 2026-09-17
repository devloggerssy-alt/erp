import { StockMovementType } from '@devloggers/db-prisma';
import { StockMovementWriter } from './stock-movement.writer';
import { createFakeInventoryTx, movementRows, balanceRows } from './__tests__/fake-inventory-tx';

const header = { tenantId: 't1', userId: 'u1', fiscalPeriodId: 'fp1' };
const draft = { warehouseId: 'w1', itemId: 'i1', movementType: StockMovementType.PURCHASE, quantity: 10, unitCost: 5 };

describe('StockMovementWriter', () => {
    it('creates the movement and a new balance on first entry', async () => {
        const fake = createFakeInventoryTx();

        const { id } = await new StockMovementWriter().write(fake.client, header, draft);

        expect(id).toBe(fake.state.movements[0]?.id);
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
