import { compileIsolated } from '../../../../common/testing/module-isolation';
import { InventoryMovementFacade } from '../inventory-movement.facade';
import { InventoryMovementsModule } from '../inventory-movements.module';
import { createFakeInventoryTx, movementRows } from './fake-inventory-tx';

describe('InventoryMovementsModule — isolation contract (Phase 8.3.2)', () => {
    it('boots without AppModule and applies a movement intent', async () => {
        const moduleRef = await compileIsolated([InventoryMovementsModule]);
        const facade = moduleRef.get(InventoryMovementFacade);
        const fake = createFakeInventoryTx();

        const result = await facade.apply(fake.client, {
            kind: 'OPENING_STOCK',
            tenantId: 't1',
            userId: 'u1',
            fiscalPeriodId: 'fp-1',
            warehouseId: 'w1',
            lines: [{ itemId: 'i1', quantity: 5, unitCost: 2 }],
        });

        expect(result.valueDelta).toBe(10);
        expect(movementRows(fake.state.movements)).toEqual([
            {
                warehouseId: 'w1',
                itemId: 'i1',
                movementType: 'OPENING',
                quantity: 5,
                unitCost: 2,
                referenceType: undefined,
                referenceId: undefined,
                notes: 'Opening Balance Registration',
            },
        ]);

        await moduleRef.close();
    });
});
