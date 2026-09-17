import { ChartOfAccountsTaskHandler } from './chart-of-accounts.handler';

describe('ChartOfAccountsTaskHandler', () => {
    it('delegates to the bootstrap facade and reports the resulting account count', async () => {
        const bootstrapService = {
            bootstrapDefaultTemplate: jest.fn().mockResolvedValue({ '1000': 'id-1000', '1100': 'id-1100' }),
        };
        const handler = new ChartOfAccountsTaskHandler(bootstrapService as never);

        const result = await handler.execute('t1', 'u1', undefined);

        expect(bootstrapService.bootstrapDefaultTemplate).toHaveBeenCalledWith('t1');
        expect(result).toEqual({ completed: true, details: { accountCount: 2 } });
    });
});
