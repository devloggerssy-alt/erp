import { BusinessSetupDiscoveryService } from './business-setup-discovery.service';

function build(overrides: Partial<Record<string, unknown>> = {}) {
    const prisma = {
        currency: { count: jest.fn().mockResolvedValue(0) },
        chartOfAccount: { count: jest.fn().mockResolvedValue(0) },
        financialSetting: { findUnique: jest.fn().mockResolvedValue(null) },
        cashbox: { count: jest.fn().mockResolvedValue(0) },
        bankAccount: { count: jest.fn().mockResolvedValue(0) },
        fiscalPeriod: { count: jest.fn().mockResolvedValue(0) },
        documentSequence: { count: jest.fn().mockResolvedValue(0) },
        warehouse: { count: jest.fn().mockResolvedValue(0) },
        item: { count: jest.fn().mockResolvedValue(0) },
        party: { count: jest.fn().mockResolvedValue(0) },
        journalLine: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
        stockMovement: { count: jest.fn().mockResolvedValue(0) },
        ...overrides,
    };
    const service = new BusinessSetupDiscoveryService(prisma as never);
    return { service, prisma };
}

describe('BusinessSetupDiscoveryService.inspect', () => {
    it('classifies every counter EMPTY when nothing exists', async () => {
        const { service } = build();
        const result = await service.inspect('tenant-1');

        expect(result.currencies).toEqual({ count: 0, classification: 'EMPTY' });
        expect(result.chartOfAccounts).toEqual({ count: 0, classification: 'EMPTY' });
        expect(result.cashboxes).toEqual({ count: 0, classification: 'EMPTY' });
    });

    it('classifies a counter EXISTING once its count is above zero', async () => {
        const { service } = build({ currency: { count: jest.fn().mockResolvedValue(2) } });
        const result = await service.inspect('tenant-1');
        expect(result.currencies).toEqual({ count: 2, classification: 'EXISTING' });
    });

    it('classifies financialMappings EMPTY / PARTIAL / EXISTING by configured-slot count out of 11', async () => {
        const { service: emptyService } = build({ financialSetting: { findUnique: jest.fn().mockResolvedValue(null) } });
        expect((await emptyService.inspect('t')).financialMappings).toEqual({ configuredSlots: 0, classification: 'EMPTY' });

        const { service: partialService } = build({
            financialSetting: { findUnique: jest.fn().mockResolvedValue({ defaultSalesAccountId: 'a', defaultPurchaseAccountId: null, defaultTaxAccountId: null, defaultReceivableAccountId: null, defaultPayableAccountId: null, defaultInventoryAccountId: null, defaultCogsAccountId: null, defaultInventoryAdjustmentAccountId: null, defaultOpeningEquityAccountId: null, defaultCashAccountId: null, defaultBankAccountId: null }) },
        });
        expect((await partialService.inspect('t')).financialMappings).toEqual({ configuredSlots: 1, classification: 'PARTIAL' });

        const fullSlots = { defaultSalesAccountId: 'a', defaultPurchaseAccountId: 'b', defaultTaxAccountId: 'c', defaultReceivableAccountId: 'd', defaultPayableAccountId: 'e', defaultInventoryAccountId: 'f', defaultCogsAccountId: 'g', defaultInventoryAdjustmentAccountId: 'h', defaultOpeningEquityAccountId: 'i', defaultCashAccountId: 'j', defaultBankAccountId: 'k' };
        const { service: fullService } = build({ financialSetting: { findUnique: jest.fn().mockResolvedValue(fullSlots) } });
        expect((await fullService.inspect('t')).financialMappings).toEqual({ configuredSlots: 11, classification: 'EXISTING' });
    });

    it('counts customers as PartyType CUSTOMER or CUSTOMER_SUPPLIER, suppliers as SUPPLIER or CUSTOMER_SUPPLIER', async () => {
        const partyCount = jest.fn().mockResolvedValue(3);
        const { service, prisma } = build({ party: { count: partyCount } });
        await service.inspect('tenant-1');

        expect(partyCount).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', type: { in: ['CUSTOMER', 'CUSTOMER_SUPPLIER'] } } });
        expect(partyCount).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', type: { in: ['SUPPLIER', 'CUSTOMER_SUPPLIER'] } } });
        void prisma;
    });

    it('splits opening-balance journal lines into receivables vs payables by matching accountId against the party override', async () => {
        const { service } = build({
            journalLine: {
                count: jest.fn().mockResolvedValue(0),
                findMany: jest.fn().mockResolvedValue([
                    { accountId: 'recv-acct', party: { receivableAccountId: 'recv-acct', payableAccountId: 'pay-acct' } },
                    { accountId: 'pay-acct', party: { receivableAccountId: 'recv-acct', payableAccountId: 'pay-acct' } },
                    { accountId: 'pay-acct', party: { receivableAccountId: 'recv-acct-2', payableAccountId: 'pay-acct' } },
                ]),
            },
        });
        const result = await service.inspect('tenant-1');
        expect(result.openingReceivables).toEqual({ count: 1, classification: 'EXISTING' });
        expect(result.openingPayables).toEqual({ count: 2, classification: 'EXISTING' });
    });

    it('resolves party opening lines against the party override or the default AR/AP control account', async () => {
        const { service } = build({
            financialSetting: {
                findUnique: jest.fn().mockResolvedValue({ defaultReceivableAccountId: 'default-ar', defaultPayableAccountId: 'default-ap' }),
            },
            journalLine: {
                count: jest.fn().mockResolvedValue(0),
                findMany: jest.fn().mockResolvedValue([
                    { accountId: 'default-ar', party: { receivableAccountId: null, payableAccountId: null } },
                    { accountId: 'override-ar', party: { receivableAccountId: 'override-ar', payableAccountId: null } },
                    { accountId: 'default-ap', party: { receivableAccountId: null, payableAccountId: null } },
                    { accountId: 'other', party: { receivableAccountId: null, payableAccountId: null } },
                ]),
            },
        });

        const result = await service.inspect('tenant-1');
        expect(result.openingReceivables).toEqual({ count: 2, classification: 'EXISTING' });
        expect(result.openingPayables).toEqual({ count: 1, classification: 'EXISTING' });
    });

    it('counts opening inventory via StockMovement.movementType OPENING', async () => {
        const stockMovementCount = jest.fn().mockResolvedValue(5);
        const { service } = build({ stockMovement: { count: stockMovementCount } });
        const result = await service.inspect('tenant-1');
        expect(stockMovementCount).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', movementType: 'OPENING' } });
        expect(result.openingInventory).toEqual({ count: 5, classification: 'EXISTING' });
    });
});
