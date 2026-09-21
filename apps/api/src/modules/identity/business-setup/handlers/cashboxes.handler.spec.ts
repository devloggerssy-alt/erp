import { CashboxesTaskHandler } from './cashboxes.handler';

function build(existingCodes: string[] = []) {
    const cashboxesService = {
        list: jest.fn().mockResolvedValue({ data: existingCodes.map((code) => ({ code })), total: existingCodes.length }),
        create: jest.fn().mockImplementation((_t: string, dto: { code: string }) => Promise.resolve({ id: `new-${dto.code}`, ...dto })),
    };
    const handler = new CashboxesTaskHandler(cashboxesService as never);
    return { handler, cashboxesService };
}

describe('CashboxesTaskHandler', () => {
    it('creates every cashbox whose code does not already exist', async () => {
        const { handler, cashboxesService } = build(['CASH-USD']);
        const result = await handler.execute('t1', 'u1', [
            { code: 'CASH-USD', name: { ar: 'صندوق دولار', en: 'USD Cash' }, currencyId: 'usd' },
            { code: 'CASH-EUR', name: { ar: 'صندوق يورو', en: 'EUR Cash' }, currencyId: 'eur' },
        ]);
        expect(cashboxesService.create).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ completed: true, details: { created: 1 } });
    });

    it('is idempotent on repeated execution with the same payload', async () => {
        const { handler, cashboxesService } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'CASH-USD', name: { ar: 'ص', en: 'C' }, currencyId: 'usd' }]);
        cashboxesService.list.mockResolvedValue({ data: [{ code: 'CASH-USD' }], total: 1 });
        const result = await handler.execute('t1', 'u1', [{ code: 'CASH-USD', name: { ar: 'ص', en: 'C' }, currencyId: 'usd' }]);
        expect(result.details).toEqual({ created: 0 });
    });

    it('rejects a payload item missing currencyId', async () => {
        const { handler } = build([]);
        await expect(handler.execute('t1', 'u1', [{ code: 'CASH-USD', name: { ar: 'ص', en: 'C' } }])).rejects.toThrow();
    });
});
