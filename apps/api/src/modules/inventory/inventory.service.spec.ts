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
