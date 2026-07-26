import { InventoryService } from './inventory.service';
import { AccountingPostingFacade } from '../accounting/posting';

describe('InventoryService.registerOpeningBalance', () => {
    it('posts movements and records an opening-stock intent with the summed value', async () => {
        const tx = {
            stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
            stockBalance: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
        };
        const prisma = {
            $transaction: jest.fn((cb: any) => cb(tx)),
            fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ status: 'OPEN' }) },
        } as any;
        const postingFacade = {
            record: jest.fn().mockResolvedValue({ journalEntryId: 'je-open' }),
            reverse: jest.fn(),
        } as unknown as AccountingPostingFacade;
        const svc = new InventoryService(prisma, {} as any, {} as any, postingFacade);

        const res = await svc.registerOpeningBalance('t', 'u', {
            warehouseId: 'w1', fiscalPeriodId: 'fp',
            items: [{ itemId: 'i1', quantity: 10, unitCost: 6 }, { itemId: 'i2', quantity: 20, unitCost: 3 }],
        } as any);

        expect(postingFacade.record).toHaveBeenCalledTimes(1);
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        // 10*6 + 20*3 = 120
        expect(intent.totalValue).toBe(120);
        expect(intent.kind).toBe('OPENING_STOCK_POSTED');
        expect(res).toMatchObject({ count: 2, warehouseId: 'w1', journalEntryId: 'je-open' });
    });

    it('rejects registering an opening balance in a CLOSED fiscal period', async () => {
        const prisma = {
            $transaction: jest.fn(),
            fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ status: 'CLOSED' }) },
        } as any;
        const postingFacade = { record: jest.fn(), reverse: jest.fn() } as unknown as AccountingPostingFacade;
        const svc = new InventoryService(prisma, {} as any, {} as any, postingFacade);

        await expect(svc.registerOpeningBalance('t', 'u', {
            warehouseId: 'w1', fiscalPeriodId: 'fp',
            items: [{ itemId: 'i1', quantity: 10, unitCost: 6 }],
        } as any)).rejects.toThrow(/closed/i);
    });
});
