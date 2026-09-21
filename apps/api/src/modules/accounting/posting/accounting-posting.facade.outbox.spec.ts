import { AccountingPostingFacade } from './accounting-posting.facade';
import type { PaymentCancelledIntent, PaymentRecordedIntent } from './contracts/posting-intent';

const tx = { marker: 'tx' } as never;

const paymentIntent: PaymentRecordedIntent = {
    kind: 'PAYMENT_RECORDED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-01T00:00:00.000Z'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'pay-1',
    description: 'Payment PAY-0001',
    type: 'RECEIPT',
    partyId: 'party-1',
    amount: 100,
    cashboxId: 'cb1',
    currencyId: 'USD',
};

const cancelIntent: PaymentCancelledIntent = {
    kind: 'PAYMENT_CANCELLED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-02T00:00:00.000Z'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'pay-1',
    description: 'Reversal of payment PAY-0001',
    originalEntryId: 'je-1',
};

function build(outboxEnabled: boolean) {
    const lines = [
        { accountId: 'cash', debit: 100, credit: 0, description: null, sortOrder: 0 },
        { accountId: 'ar', debit: 0, credit: 100, description: null, sortOrder: 1 },
    ];
    const registry = {
        resolvePosting: jest
            .fn()
            .mockReturnValue({ referenceType: 'PAYMENT', buildLines: jest.fn().mockResolvedValue(lines) }),
        resolveReversal: jest.fn().mockReturnValue({ referenceType: 'PAYMENT_CANCELLATION' }),
    };
    const journalPosting = {
        post: jest.fn().mockResolvedValue({ id: 'je-1' }),
        reverse: jest.fn().mockResolvedValue({ id: 'je-2' }),
    };
    const docSeq = { getNextNumber: jest.fn().mockResolvedValue('JE-000001') };
    const audit = { recordInTx: jest.fn().mockResolvedValue(undefined) };
    const outbox = { enqueue: jest.fn().mockResolvedValue({ id: 'ob-1' }) };
    const config = { get: jest.fn().mockReturnValue(outboxEnabled ? 'true' : 'false') };
    const facade = new AccountingPostingFacade(
        registry as never,
        journalPosting as never,
        docSeq as never,
        audit as never,
        outbox as never,
        config as never,
    );
    return { facade, outbox };
}

describe('AccountingPostingFacade — dual-write outbox (Phase 8.4.2)', () => {
    it('does not write an outbox row when the flag is off (default)', async () => {
        const { facade, outbox } = build(false);
        await expect(facade.record(tx, paymentIntent)).resolves.toEqual({ journalEntryId: 'je-1' });
        expect(outbox.enqueue).not.toHaveBeenCalled();
    });

    it('writes a JSON-safe posting event in the same transaction when enabled', async () => {
        const { facade, outbox } = build(true);
        await facade.record(tx, paymentIntent);

        expect(outbox.enqueue).toHaveBeenCalledWith(tx, {
            tenantId: 't1',
            topic: 'accounting.journal-posted',
            payload: {
                journalEntryId: 'je-1',
                number: 'JE-000001',
                intentKind: 'PAYMENT_RECORDED',
                intent: { ...paymentIntent, date: '2026-03-01T00:00:00.000Z' },
            },
        });
    });

    it('writes a reversal event when enabled', async () => {
        const { facade, outbox } = build(true);
        await facade.reverse(tx, cancelIntent);

        expect(outbox.enqueue).toHaveBeenCalledWith(tx, {
            tenantId: 't1',
            topic: 'accounting.journal-reversed',
            payload: {
                journalEntryId: 'je-2',
                number: 'JE-000001',
                intentKind: 'PAYMENT_CANCELLED',
                reversalOfId: 'je-1',
                intent: { ...cancelIntent, date: '2026-03-02T00:00:00.000Z' },
            },
        });
    });

    it('propagates an outbox failure so the caller transaction rolls back', async () => {
        const { facade, outbox } = build(true);
        outbox.enqueue.mockRejectedValue(new Error('outbox down'));
        await expect(facade.record(tx, paymentIntent)).rejects.toThrow('outbox down');
    });
});
