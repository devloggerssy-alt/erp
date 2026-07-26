import { BadRequestException } from '@nestjs/common';
import { StockCountAdjustedPolicy } from './stock-count-adjusted.policy';
import type { StockCountAdjustedIntent } from '../contracts/posting-intent';

function build(settings: Record<string, unknown> = { defaultInventoryAccountId: 'inv', defaultInventoryAdjustmentAccountId: 'adj' }) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    return new StockCountAdjustedPolicy(financialSettingsService);
}

const baseIntent: StockCountAdjustedIntent = {
    kind: 'STOCK_COUNT_ADJUSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-04'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'sc-1',
    description: 'Stock count variance SC-001',
    netVariance: 250,
};

describe('StockCountAdjustedPolicy.buildLines', () => {
    it('surplus debits Inventory, credits the adjustment account', async () => {
        const lines = await build().buildLines(baseIntent);
        expect(lines).toEqual([
            { accountId: 'inv', debit: 250, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'adj', debit: 0, credit: 250, description: null, sortOrder: 1 },
        ]);
    });

    it('shortage reverses the sides and uses the absolute amount', async () => {
        const lines = await build().buildLines({ ...baseIntent, netVariance: -250 });
        expect(lines).toEqual([
            { accountId: 'inv', debit: 0, credit: 250, description: null, sortOrder: 0 },
            { accountId: 'adj', debit: 250, credit: 0, description: null, sortOrder: 1 },
        ]);
    });

    it('rejects when Inventory / Adjustment accounts are not configured', async () => {
        const policy = build({});
        await expect(policy.buildLines(baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });
});
