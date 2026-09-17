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

function build() {
    const lines = [
        { accountId: 'cash', debit: 100, credit: 0, description: null, sortOrder: 0 },
        { accountId: 'ar', debit: 0, credit: 100, description: null, sortOrder: 1 },
    ];
    const registry = {
        resolvePosting: jest.fn().mockReturnValue({ referenceType: 'PAYMENT', buildLines: jest.fn().mockResolvedValue(lines) }),
        resolveReversal: jest.fn().mockReturnValue({ referenceType: 'PAYMENT_CANCELLATION' }),
    };
    const journalPosting = {
        post: jest.fn().mockResolvedValue({ id: 'je-1' }),
        reverse: jest.fn().mockResolvedValue({ id: 'je-2' }),
    };
    const docSeq = { getNextNumber: jest.fn().mockResolvedValue('JE-000001') };
    const audit = { recordInTx: jest.fn().mockResolvedValue(undefined) };
    const facade = new AccountingPostingFacade(registry as never, journalPosting as never, docSeq as never, audit as never);
    return { facade, journalPosting, audit };
}

describe('AccountingPostingFacade — GL audit (7.2.1)', () => {
    it('audits a payment post inside the posting transaction', async () => {
        const { facade, audit } = build();
        await facade.record(tx, paymentIntent);
        expect(audit.recordInTx).toHaveBeenCalledWith(tx, {
            tenantId: 't1',
            userId: 'u1',
            action: 'JOURNAL_POST',
            entityType: 'journal_entry',
            entityId: 'je-1',
            source: 'GL',
            newValues: {
                number: 'JE-000001',
                referenceType: 'PAYMENT',
                referenceId: 'pay-1',
                date: paymentIntent.date,
                fiscalPeriodId: 'fp1',
                lineCount: 2,
                totalDebit: 100,
            },
            metadata: { intentKind: 'PAYMENT_RECORDED' },
        });
    });

    it('audits a reversal with a link to the original entry', async () => {
        const { facade, audit } = build();
        await facade.reverse(tx, cancelIntent);
        expect(audit.recordInTx).toHaveBeenCalledWith(
            tx,
            expect.objectContaining({
                action: 'JOURNAL_REVERSE',
                entityId: 'je-2',
                newValues: expect.objectContaining({ reversalOfId: 'je-1', referenceType: 'PAYMENT_CANCELLATION' }),
            }),
        );
    });

    it('fails the posting when the audit insert fails (atomic by design)', async () => {
        const { facade, audit } = build();
        audit.recordInTx.mockRejectedValue(new Error('audit insert failed'));
        await expect(facade.record(tx, paymentIntent)).rejects.toThrow('audit insert failed');
    });

    it('writes no audit row when posting itself is rejected', async () => {
        const { facade, journalPosting, audit } = build();
        journalPosting.post.mockRejectedValue(new Error('not balanced'));
        await expect(facade.record(tx, paymentIntent)).rejects.toThrow('not balanced');
        expect(audit.recordInTx).not.toHaveBeenCalled();
    });
});
