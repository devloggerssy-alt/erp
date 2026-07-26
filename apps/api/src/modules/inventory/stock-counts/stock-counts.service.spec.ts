import { StockCountsService } from './stock-counts.service';
import { AccountingPostingFacade } from '../../accounting/posting';

function build() {
    const tx = {
        stockMovement: { create: jest.fn() },
        stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'b', quantity: 5, averageCost: 10 }), create: jest.fn(), update: jest.fn() },
        stockCount: { update: jest.fn().mockResolvedValue({ id: 'sc', lines: [], warehouse: {} }) },
    };
    const prisma = { item: { findMany: jest.fn().mockResolvedValue([{ id: 'i1', itemType: 'product' }]) }, $transaction: jest.fn((cb: any) => cb(tx)) } as any;
    const inventory = { postMovementTx: jest.fn() } as any;
    const seq = { getNextNumber: jest.fn().mockResolvedValue('JE-1') } as any;
    const repo = { findById: jest.fn() } as any;
    const presenter = { toDetailResponse: jest.fn((x) => x) } as any;
    const emitter = { emit: jest.fn() } as any;
    const postingFacade = {
        record: jest.fn().mockResolvedValue({ journalEntryId: 'je' }),
        reverse: jest.fn(),
    } as unknown as AccountingPostingFacade;
    const svc = new StockCountsService(prisma, inventory, seq, repo, presenter, emitter, postingFacade);
    return { svc, prisma, tx, inventory, repo, postingFacade };
}

describe('StockCountsService.post', () => {
    it('values the movement at averageCost and posts a variance JE', async () => {
        const { svc, tx, inventory, repo, postingFacade } = build();
        repo.findById.mockResolvedValue({
            id: 'sc', number: 'SC1', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp',
            fiscalPeriod: { status: 'OPEN' }, lines: [{ itemId: 'i1', difference: 3 }],
        });
        await svc.post('t', 'sc', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'STOCK_COUNT', quantity: 3, unitCost: 10 }));
        expect(postingFacade.record).toHaveBeenCalledTimes(1);
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        // surplus 3 * 10 = 30
        expect(intent.netVariance).toBe(30);
    });

    it('rejects posting to a LOCKED period', async () => {
        const { svc, repo } = build();
        repo.findById.mockResolvedValue({ id: 'sc', status: 'DRAFT', fiscalPeriod: { status: 'LOCKED' }, lines: [] });
        await expect(svc.post('t', 'sc', 'u')).rejects.toThrow(/locked/i);
    });
});
