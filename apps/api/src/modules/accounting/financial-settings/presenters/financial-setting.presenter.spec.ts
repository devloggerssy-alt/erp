import { FinancialSettingPresenter } from './financial-setting.presenter';
import type { FinancialSetting } from '@devloggers/db-prisma';

const IDS = {
    defaultSalesAccountId: 'sales',
    defaultPurchaseAccountId: 'purchase',
    defaultTaxAccountId: 'tax',
    defaultReceivableAccountId: 'ar',
    defaultPayableAccountId: 'ap',
    defaultInventoryAccountId: 'inventory',
    defaultCogsAccountId: 'cogs',
    defaultInventoryAdjustmentAccountId: 'shrink',
    defaultOpeningEquityAccountId: 'equity',
    defaultCashAccountId: 'cash',
    defaultBankAccountId: 'bank',
} as const;

function makeSetting(overrides: Partial<FinancialSetting> = {}): FinancialSetting {
    return {
        id: 'fs-1',
        tenantId: 'tenant-1',
        ...IDS,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        ...overrides,
    } as unknown as FinancialSetting;
}

describe('FinancialSettingPresenter.toResponse', () => {
    const presenter = new FinancialSettingPresenter();

    it('returns the flat account identifiers the settings form reads', () => {
        expect(presenter.toResponse(makeSetting())).toEqual(IDS);
    });

    it('serializes a missing selection as null so a reload does not invent an account', () => {
        const response = presenter.toResponse(makeSetting({
            defaultSalesAccountId: null,
            defaultCashAccountId: null,
        }));

        expect(response.defaultSalesAccountId).toBeNull();
        expect(response.defaultCashAccountId).toBeNull();
        expect(response.defaultBankAccountId).toBe(IDS.defaultBankAccountId);
    });
});
