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
