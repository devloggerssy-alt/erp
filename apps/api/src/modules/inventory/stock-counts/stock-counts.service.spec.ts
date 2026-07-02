import { StockCountsService } from './stock-counts.service';

function build(settings = { defaultInventoryAccountId: 'inv', defaultInventoryAdjustmentAccountId: 'adj' }) {
    const tx = {
        stockMovement: { create: jest.fn() }, stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'b', quantity: 5, averageCost: 10 }), create: jest.fn(), update: jest.fn() },
        journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je' }) },
        chartOfAccount: { findUnique: jest.fn().mockResolvedValue({ type: 'ASSET' }), update: jest.fn() },
        stockCount: { update: jest.fn().mockResolvedValue({ id: 'sc', lines: [], warehouse: {} }) },
    };
    const prisma = { item: { findMany: jest.fn().mockResolvedValue([{ id: 'i1', itemType: 'product' }]) }, $transaction: jest.fn((cb: any) => cb(tx)) } as any;
    const inventory = { postMovementTx: jest.fn() } as any;
    const seq = { getNextNumber: jest.fn().mockResolvedValue('JE-1') } as any;
    const repo = { findById: jest.fn() } as any;
    const presenter = { toDetailResponse: jest.fn((x) => x) } as any;
    const emitter = { emit: jest.fn() } as any;
    const fs = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    const svc = new StockCountsService(prisma, inventory, seq, repo, presenter, emitter, fs);
    return { svc, prisma, tx, inventory, repo };
}

describe('StockCountsService.post', () => {
    it('values the movement at averageCost and posts a variance JE', async () => {
        const { svc, tx, inventory, repo } = build();
        repo.findById.mockResolvedValue({
            id: 'sc', number: 'SC1', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp',
            fiscalPeriod: { status: 'OPEN' }, lines: [{ itemId: 'i1', difference: 3 }],
        });
        await svc.post('t', 'sc', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'STOCK_COUNT', quantity: 3, unitCost: 10 }));
        const lines = tx.journalEntry.create.mock.calls[0][0].data.lines.create;
        // surplus 3 * 10 = 30 => DR inv 30 / CR adj 30
        expect(lines).toEqual(expect.arrayContaining([
            expect.objectContaining({ accountId: 'inv', debit: 30 }),
            expect.objectContaining({ accountId: 'adj', credit: 30 }),
        ]));
    });

    it('rejects posting to a LOCKED period', async () => {
        const { svc, repo } = build();
        repo.findById.mockResolvedValue({ id: 'sc', status: 'DRAFT', fiscalPeriod: { status: 'LOCKED' }, lines: [] });
        await expect(svc.post('t', 'sc', 'u')).rejects.toThrow(/locked/i);
    });
});
