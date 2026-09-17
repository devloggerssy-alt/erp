import { OpeningReceivablesTaskHandler } from './opening-receivables.handler';

function build(alreadyPostedPartyIds: string[] = []) {
    const partyOpeningBalanceService = { post: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }) };
    const prisma = {
        journalLine: {
            findFirst: jest.fn().mockImplementation(({ where }: { where: { partyId: string } }) =>
                Promise.resolve(alreadyPostedPartyIds.includes(where.partyId) ? { id: 'existing-line' } : null)),
        },
    };
    const handler = new OpeningReceivablesTaskHandler(partyOpeningBalanceService as never, prisma as never);
    return { handler, partyOpeningBalanceService };
}

describe('OpeningReceivablesTaskHandler', () => {
    it('posts every AR line whose party has no existing OPENING_BALANCE journal line, hardcoding partySide AR', async () => {
        const { handler, partyOpeningBalanceService } = build(['party-already-posted']);
        const result = await handler.execute('t1', 'u1', [
            { partyId: 'party-already-posted', currencyId: 'usd', amount: 250, fiscalPeriodId: 'fp-1' },
            { partyId: 'party-new', currencyId: 'usd', amount: 400, fiscalPeriodId: 'fp-1' },
        ]);

        expect(partyOpeningBalanceService.post).toHaveBeenCalledTimes(1);
        expect(partyOpeningBalanceService.post).toHaveBeenCalledWith('t1', 'u1', expect.objectContaining({ partyId: 'party-new', partySide: 'AR' }));
        expect(result).toEqual({ completed: true, details: { posted: 1 } });
    });
});
