import { BadRequestException } from '@nestjs/common';
import { OpeningStockPolicy } from './opening-stock.policy';
import type { OpeningStockPostedIntent } from '../contracts/posting-intent';

function build(settings: Record<string, unknown> = { defaultInventoryAccountId: 'inv', defaultOpeningEquityAccountId: 'oe' }) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    return new OpeningStockPolicy(financialSettingsService);
}

const baseIntent: OpeningStockPostedIntent = {
    kind: 'OPENING_STOCK_POSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-01-01'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'warehouse-1',
    description: 'Opening inventory balance',
    totalValue: 5000,
};

describe('OpeningStockPolicy.buildLines', () => {
    it('debits Inventory and credits Opening Balance Equity', async () => {
        const lines = await build().buildLines(baseIntent);
        expect(lines).toEqual([
            { accountId: 'inv', debit: 5000, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'oe', debit: 0, credit: 5000, description: null, sortOrder: 1 },
        ]);
    });

    it('rounds to 4 decimal places, matching @db.Decimal(18,4)', async () => {
        const [inventoryLine] = await build().buildLines({ ...baseIntent, totalValue: 123.456789 });
        expect(inventoryLine!.debit).toBe(123.4568);
    });

    it('rejects when Inventory / Opening-Equity accounts are not configured', async () => {
        await expect(build({}).buildLines(baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });
});
