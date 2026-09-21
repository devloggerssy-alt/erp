import { FinancialMappingsTaskHandler } from './financial-mappings.handler';

describe('FinancialMappingsTaskHandler', () => {
    it('validates the payload and delegates to FinancialSettingsService.upsert', async () => {
        const financialSettingsService = { upsert: jest.fn().mockResolvedValue({ id: 'fs-1' }) };
        const handler = new FinancialMappingsTaskHandler(financialSettingsService as never);

        const result = await handler.execute('t1', 'u1', { defaultSalesAccountId: 'acct-1', defaultCashAccountId: 'acct-2' });

        expect(financialSettingsService.upsert).toHaveBeenCalledWith('t1', expect.objectContaining({ defaultSalesAccountId: 'acct-1', defaultCashAccountId: 'acct-2' }));
        expect(result).toEqual({ completed: true, details: {} });
    });

    it('accepts an empty payload — every slot is optional', async () => {
        const financialSettingsService = { upsert: jest.fn().mockResolvedValue({ id: 'fs-1' }) };
        const handler = new FinancialMappingsTaskHandler(financialSettingsService as never);
        await expect(handler.execute('t1', 'u1', {})).resolves.toEqual({ completed: true, details: {} });
    });
});
