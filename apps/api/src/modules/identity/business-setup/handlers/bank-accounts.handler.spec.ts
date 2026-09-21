import { BankAccountsTaskHandler } from './bank-accounts.handler';

function build(existingCodes: string[] = []) {
    const bankAccountsService = {
        list: jest.fn().mockResolvedValue({ data: existingCodes.map((code) => ({ code })), total: existingCodes.length }),
        create: jest.fn().mockImplementation((_t: string, dto: { code: string }) => Promise.resolve({ id: `new-${dto.code}`, ...dto })),
    };
    const handler = new BankAccountsTaskHandler(bankAccountsService as never);
    return { handler, bankAccountsService };
}

describe('BankAccountsTaskHandler', () => {
    it('creates every bank account whose code does not already exist', async () => {
        const { handler, bankAccountsService } = build(['BANK-USD']);
        const result = await handler.execute('t1', 'u1', [
            { code: 'BANK-USD', name: { ar: 'بنك', en: 'Bank' }, currencyId: 'usd' },
            { code: 'BANK-EUR', name: { ar: 'بنك يورو', en: 'EUR Bank' }, currencyId: 'eur' },
        ]);
        expect(bankAccountsService.create).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ completed: true, details: { created: 1 } });
    });

    it('is idempotent on repeated execution with the same payload', async () => {
        const { handler, bankAccountsService } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'BANK-USD', name: { ar: 'ب', en: 'B' }, currencyId: 'usd' }]);
        bankAccountsService.list.mockResolvedValue({ data: [{ code: 'BANK-USD' }], total: 1 });
        const result = await handler.execute('t1', 'u1', [{ code: 'BANK-USD', name: { ar: 'ب', en: 'B' }, currencyId: 'usd' }]);
        expect(result.details).toEqual({ created: 0 });
    });
});
