import { BadRequestException } from '@nestjs/common';
import { InvoicePostedPolicy } from './invoice-posted.policy';
import type { InvoicePostedIntent } from '../contracts/posting-intent';

const SETTINGS = {
    defaultReceivableAccountId: 'ar',
    defaultPayableAccountId: 'ap',
    defaultSalesAccountId: 'sales',
    defaultPurchaseAccountId: 'purchase',
    defaultTaxAccountId: 'tax',
    defaultInventoryAccountId: 'inv',
    defaultCogsAccountId: 'cogs',
};

function build(settings: Partial<typeof SETTINGS> = {}) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue({ ...SETTINGS, ...settings }) } as any;
    const tx = { party: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    return { policy: new InvoicePostedPolicy(financialSettingsService), tx, financialSettingsService };
}

const baseIntent: InvoicePostedIntent = {
    kind: 'INVOICE_POSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-01'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'inv-1',
    description: 'Purchase invoice INV-001',
    direction: 'PURCHASE',
    partyId: 'party-1',
    netAmount: 1000,
    taxAmount: 0,
    total: 1000,
};

describe('InvoicePostedPolicy.buildLines', () => {
    it('PURCHASE with no inventory portion: debits Purchase, credits Payable', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines).toEqual([
            { accountId: 'purchase', debit: 1000, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'ap', debit: 0, credit: 1000, description: null, sortOrder: 1, partyId: 'party-1' },
        ]);
    });

    it('PURCHASE with a stock portion: capitalises to Inventory and expenses the remainder', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, inventoryAmount: 700 });
        expect(lines).toEqual([
            { accountId: 'inv', debit: 700, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'purchase', debit: 300, credit: 0, description: null, sortOrder: 1 },
            { accountId: 'ap', debit: 0, credit: 1000, description: null, sortOrder: 2, partyId: 'party-1' },
        ]);
    });

    it('party-level payable override wins over the tenant default', async () => {
        const { policy, tx } = build();
        tx.party.findFirst.mockResolvedValue({ payableAccountId: 'party-ap', receivableAccountId: null });
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines.at(-1)).toMatchObject({ accountId: 'party-ap' });
    });

    it('rejects a PURCHASE with no payable account configured anywhere', async () => {
        const { policy, tx } = build({ defaultPayableAccountId: undefined as any });
        await expect(policy.buildLines(tx, baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('SALE: debits Receivable, credits Sales, with the party on the AR leg', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, direction: 'SALE' });
        expect(lines).toEqual([
            { accountId: 'ar', debit: 1000, credit: 0, description: null, sortOrder: 0, partyId: 'party-1' },
            { accountId: 'sales', debit: 0, credit: 1000, description: null, sortOrder: 1 },
        ]);
    });

    it('SALE with tax: Tax Payable is credited alongside revenue', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, direction: 'SALE', taxAmount: 150, total: 1150 });
        expect(lines).toEqual([
            { accountId: 'ar', debit: 1150, credit: 0, description: null, sortOrder: 0, partyId: 'party-1' },
            { accountId: 'sales', debit: 0, credit: 1000, description: null, sortOrder: 1 },
            { accountId: 'tax', debit: 0, credit: 150, description: null, sortOrder: 2 },
        ]);
    });

    it('SALE with a cogsTotal: appends DR COGS / CR Inventory after the revenue legs', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, direction: 'SALE', cogsTotal: 600 });
        expect(lines).toEqual([
            { accountId: 'ar', debit: 1000, credit: 0, description: null, sortOrder: 0, partyId: 'party-1' },
            { accountId: 'sales', debit: 0, credit: 1000, description: null, sortOrder: 1 },
            { accountId: 'cogs', debit: 600, credit: 0, description: null, sortOrder: 2 },
            { accountId: 'inv', debit: 0, credit: 600, description: null, sortOrder: 3 },
        ]);
    });

    it('applies the exchange rate to every leg', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, exchangeRate: 2.5 });
        expect(lines).toEqual([
            { accountId: 'purchase', debit: 2500, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'ap', debit: 0, credit: 2500, description: null, sortOrder: 1, partyId: 'party-1' },
        ]);
    });
});
