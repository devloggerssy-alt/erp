import { OpeningCashBalancesTaskHandler } from './opening-cash-balances.handler';

function build(alreadyPosted: string[] = []) {
    const openingCashService = { post: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }) };
    const prisma = {
        journalLine: {
            findFirst: jest.fn().mockImplementation(({ where }: { where: { cashboxId: string } }) =>
                Promise.resolve(alreadyPosted.includes(where.cashboxId) ? { id: 'existing-line' } : null)),
        },
    };
    const handler = new OpeningCashBalancesTaskHandler(openingCashService as never, prisma as never);
    return { handler, openingCashService, prisma };
}

describe('OpeningCashBalancesTaskHandler', () => {
    it('posts every line whose cashbox has no existing OPENING_BALANCE journal line', async () => {
        const { handler, openingCashService } = build(['cashbox-already-posted']);
        const result = await handler.execute('t1', 'u1', [
            { cashboxId: 'cashbox-already-posted', currencyId: 'usd', amount: 100, fiscalPeriodId: 'fp-1' },
            { cashboxId: 'cashbox-new', currencyId: 'usd', amount: 200, fiscalPeriodId: 'fp-1' },
        ]);

        expect(openingCashService.post).toHaveBeenCalledTimes(1);
        expect(openingCashService.post).toHaveBeenCalledWith('t1', 'u1', expect.objectContaining({ cashboxId: 'cashbox-new', amount: 200 }));
        expect(result).toEqual({ completed: true, details: { posted: 1 } });
    });

    it('rejects a line missing fiscalPeriodId', async () => {
        const { handler } = build([]);
        await expect(handler.execute('t1', 'u1', [{ cashboxId: 'c1', currencyId: 'usd', amount: 100 }])).rejects.toThrow();
    });
});
