import { BadRequestException } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { PaymentRecordedPolicy, PaymentCancelledPolicy } from './payment-recorded.policy';
import type { PaymentRecordedIntent } from '../contracts/posting-intent';

const SETTINGS = { defaultReceivableAccountId: 'ar', defaultPayableAccountId: 'ap' };

function build(settings: Partial<typeof SETTINGS> = {}) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue({ ...SETTINGS, ...settings }) } as any;
    const tx = { party: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    return { policy: new PaymentRecordedPolicy(financialSettingsService), tx };
}

const baseIntent: PaymentRecordedIntent = {
    kind: 'PAYMENT_RECORDED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-02'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'payment-1',
    description: 'Payment PAY-001',
    type: 'RECEIPT',
    partyId: 'party-1',
    amount: 500,
    cashboxAccountId: 'cashbox',
};

describe('PaymentRecordedPolicy.buildLines', () => {
    it('RECEIPT: debits Cashbox, credits Receivable with the party on the AR leg', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines).toEqual([
            { accountId: 'cashbox', debit: 500, credit: 0, description: null, sortOrder: 0, partyId: null },
            { accountId: 'ar', debit: 0, credit: 500, description: null, sortOrder: 1, partyId: 'party-1' },
        ]);
    });

    it('PAYMENT: debits Payable (party on the AP leg), credits Cashbox', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, type: 'PAYMENT' });
        expect(lines).toEqual([
            { accountId: 'ap', debit: 500, credit: 0, description: null, sortOrder: 0, partyId: 'party-1' },
            { accountId: 'cashbox', debit: 0, credit: 500, description: null, sortOrder: 1, partyId: null },
        ]);
    });

    it('party-level receivable override wins over the tenant default', async () => {
        const { policy, tx } = build();
        tx.party.findFirst.mockResolvedValue({ receivableAccountId: 'party-ar', payableAccountId: null });
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines[1]).toMatchObject({ accountId: 'party-ar' });
    });

    it('rejects a RECEIPT with no receivable account configured anywhere', async () => {
        const { policy, tx } = build({ defaultReceivableAccountId: undefined as any });
        await expect(policy.buildLines(tx, baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('applies the exchange rate', async () => {
        const { policy, tx } = build();
        const lines = await policy.buildLines(tx, { ...baseIntent, exchangeRate: 3 });
        expect(lines.map((l) => l.debit + l.credit)).toEqual([1500, 1500]);
    });
});

describe('PaymentCancelledPolicy', () => {
    it('names the PAYMENT_CANCELLATION reference type', () => {
        expect(new PaymentCancelledPolicy().referenceType).toBe(ReferenceType.PAYMENT_CANCELLATION);
    });
});
