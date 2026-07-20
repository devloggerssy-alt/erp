import { InventoryService } from './inventory.service';

describe('InventoryService.registerOpeningBalance', () => {
    it('posts movements and a DR Inventory / CR Opening Equity entry', async () => {
        const tx = {
            stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
            stockBalance: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
            chartOfAccount: { findMany: jest.fn().mockResolvedValue([
                { id: 'inv', code: 'inv', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null },
                { id: 'oe', code: 'oe', type: 'EQUITY', isPostable: true, isContra: false, deletedAt: null },
            ]) },
        };
        const prisma = {
            $transaction: jest.fn((cb: any) => cb(tx)),
            fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ status: 'OPEN' }) },
        } as any;
        const fs = { getOrThrow: jest.fn().mockResolvedValue({ defaultInventoryAccountId: 'inv', defaultOpeningEquityAccountId: 'oe' }) } as any;
        const seq = { getNextNumber: jest.fn().mockResolvedValue('JE-1') } as any;
        const journalPosting = { post: jest.fn().mockResolvedValue({ id: 'je-open' }), reverse: jest.fn() } as any;
        const svc = new InventoryService(prisma, {} as any, {} as any, fs, seq, journalPosting);

        const res = await svc.registerOpeningBalance('t', 'u', {
            warehouseId: 'w1', fiscalPeriodId: 'fp',
            items: [{ itemId: 'i1', quantity: 10, unitCost: 6 }, { itemId: 'i2', quantity: 20, unitCost: 3 }],
        } as any);

        expect(journalPosting.post).toHaveBeenCalledTimes(1);
        const lines = journalPosting.post.mock.calls[0][1].lines;
        // 10*6 + 20*3 = 120
        expect(lines).toEqual(expect.arrayContaining([
            expect.objectContaining({ accountId: 'inv', debit: 120 }),
            expect.objectContaining({ accountId: 'oe', credit: 120 }),
        ]));
        expect(res).toMatchObject({ count: 2, warehouseId: 'w1', journalEntryId: 'je-open' });
    });

    it('rejects registering an opening balance in a CLOSED fiscal period', async () => {
        const prisma = {
            $transaction: jest.fn(),
            fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ status: 'CLOSED' }) },
        } as any;
        const fs = { getOrThrow: jest.fn().mockResolvedValue({ defaultInventoryAccountId: 'inv', defaultOpeningEquityAccountId: 'oe' }) } as any;
        const seq = { getNextNumber: jest.fn().mockResolvedValue('JE-1') } as any;
        const journalPosting = { post: jest.fn(), reverse: jest.fn() } as any;
        const svc = new InventoryService(prisma, {} as any, {} as any, fs, seq, journalPosting);

        await expect(svc.registerOpeningBalance('t', 'u', {
            warehouseId: 'w1', fiscalPeriodId: 'fp',
            items: [{ itemId: 'i1', quantity: 10, unitCost: 6 }],
        } as any)).rejects.toThrow(/closed/i);
    });
});
