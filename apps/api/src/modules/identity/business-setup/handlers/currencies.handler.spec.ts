import { CurrenciesTaskHandler } from './currencies.handler';

function build(existingCodes: string[] = []) {
    const currenciesService = {
        list: jest.fn().mockResolvedValue({ data: existingCodes.map((code) => ({ code, id: `id-${code}` })), total: existingCodes.length }),
        create: jest.fn().mockImplementation((_t: string, dto: { code: string }) => Promise.resolve({ id: `new-${dto.code}`, ...dto })),
    };
    const prisma = { tenant: { update: jest.fn().mockResolvedValue({}) } };
    const handler = new CurrenciesTaskHandler(currenciesService as never, prisma as never);
    return { handler, currenciesService, prisma };
}

describe('CurrenciesTaskHandler', () => {
    it('creates every currency not already present and reports the created count', async () => {
        const { handler, currenciesService } = build(['SYP']);
        const result = await handler.execute('t1', 'u1', [
            { code: 'SYP', name: { ar: 'ليرة', en: 'Lira' } },
            { code: 'EUR', name: { ar: 'يورو', en: 'Euro' }, isBase: true },
        ]);

        expect(currenciesService.create).toHaveBeenCalledTimes(1);
        expect(currenciesService.create).toHaveBeenCalledWith('t1', { code: 'EUR', name: { ar: 'يورو', en: 'Euro' }, isBase: true });
        expect(result).toEqual({ completed: true, details: { created: 1 } });
    });

    it('sets the tenant baseCurrencyId when a created currency has isBase: true', async () => {
        const { handler, prisma } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'USD', name: { ar: 'دولار', en: 'Dollar' }, isBase: true }]);
        expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { baseCurrencyId: 'new-USD' } });
    });

    it('does not touch tenant.baseCurrencyId when no created currency is base', async () => {
        const { handler, prisma } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'EUR', name: { ar: 'يورو', en: 'Euro' } }]);
        expect(prisma.tenant.update).not.toHaveBeenCalled();
    });

    it('is idempotent — calling execute twice with the same payload creates nothing the second time', async () => {
        const { handler, currenciesService } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'USD', name: { ar: 'دولار', en: 'Dollar' } }]);
        currenciesService.list.mockResolvedValue({ data: [{ code: 'USD', id: 'new-USD' }], total: 1 });
        const result = await handler.execute('t1', 'u1', [{ code: 'USD', name: { ar: 'دولار', en: 'Dollar' } }]);
        expect(result.details).toEqual({ created: 0 });
    });

    it('rejects a payload with an invalid currency item', async () => {
        const { handler } = build([]);
        await expect(handler.execute('t1', 'u1', [{ code: '', name: { ar: 'x' } }])).rejects.toThrow();
    });
});
