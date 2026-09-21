import { OpeningBankBalancesTaskHandler } from './opening-bank-balances.handler';

function build(alreadyPosted: string[] = []) {
    const openingBankService = { post: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }) };
    const prisma = {
        journalLine: {
            findFirst: jest.fn().mockImplementation(({ where }: { where: { bankAccountId: string } }) =>
                Promise.resolve(alreadyPosted.includes(where.bankAccountId) ? { id: 'existing-line' } : null)),
        },
    };
    const handler = new OpeningBankBalancesTaskHandler(openingBankService as never, prisma as never);
    return { handler, openingBankService };
}

describe('OpeningBankBalancesTaskHandler', () => {
    it('posts every line whose bank account has no existing OPENING_BALANCE journal line', async () => {
        const { handler, openingBankService } = build(['bank-already-posted']);
        const result = await handler.execute('t1', 'u1', [
            { bankAccountId: 'bank-already-posted', currencyId: 'usd', amount: 500, fiscalPeriodId: 'fp-1' },
            { bankAccountId: 'bank-new', currencyId: 'usd', amount: 900, fiscalPeriodId: 'fp-1' },
        ]);

        expect(openingBankService.post).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ completed: true, details: { posted: 1 } });
    });
});
