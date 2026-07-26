import { BadRequestException } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { AccountingPostingFacade } from './accounting-posting.facade';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';

function build() {
    const registry = {
        resolvePosting: jest.fn().mockReturnValue({
            referenceType: ReferenceType.INVOICE,
            buildLines: jest.fn().mockResolvedValue([{ accountId: 'a', debit: 100, credit: 0, description: null, sortOrder: 0 }]),
        }),
        resolveReversal: jest.fn().mockReturnValue({ referenceType: ReferenceType.INVOICE_CANCELLATION }),
    } as any;
    const journalPosting = {
        post: jest.fn().mockResolvedValue({ id: 'je-1' }),
        reverse: jest.fn().mockResolvedValue({ id: 'je-rev' }),
    } as any;
    const docSeqService = { getNextNumber: jest.fn().mockResolvedValue('JE-000001') } as any;
    return { facade: new AccountingPostingFacade(registry, journalPosting, docSeqService), registry, journalPosting, docSeqService };
}

const recordIntent: PostingRecordIntent = {
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

describe('AccountingPostingFacade.record', () => {
    it('checks the period, resolves the policy, allocates a number, then posts', async () => {
        const { facade, journalPosting, docSeqService } = build();
        const tx = {} as any;
        const result = await facade.record(tx, recordIntent);

        expect(docSeqService.getNextNumber).toHaveBeenCalledWith('t1', 'JOURNAL_ENTRY');
        expect(journalPosting.post).toHaveBeenCalledWith(tx, expect.objectContaining({
            tenantId: 't1',
            number: 'JE-000001',
            referenceType: ReferenceType.INVOICE,
            referenceId: 'inv-1',
            description: 'Purchase invoice INV-001',
            lines: [{ accountId: 'a', debit: 100, credit: 0, description: null, sortOrder: 0 }],
        }));
        expect(result).toEqual({ journalEntryId: 'je-1' });
    });

    it('rejects before allocating a JE number when the period is not OPEN', async () => {
        const { facade, docSeqService } = build();
        await expect(
            facade.record({} as any, { ...recordIntent, fiscalPeriodStatus: 'CLOSED' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(docSeqService.getNextNumber).not.toHaveBeenCalled();
    });
});

const cancelIntent: PostingCancellationIntent = {
    kind: 'INVOICE_CANCELLED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-05'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'inv-1',
    description: 'Reversal of invoice INV-001',
    originalEntryId: 'je-orig',
};

describe('AccountingPostingFacade.reverse', () => {
    it('resolves the reversal referenceType, allocates a number, then reverses', async () => {
        const { facade, journalPosting, docSeqService } = build();
        const tx = {} as any;
        const result = await facade.reverse(tx, cancelIntent);

        expect(docSeqService.getNextNumber).toHaveBeenCalledWith('t1', 'JOURNAL_ENTRY');
        expect(journalPosting.reverse).toHaveBeenCalledWith(tx, expect.objectContaining({
            tenantId: 't1',
            number: 'JE-000001',
            originalEntryId: 'je-orig',
            referenceType: ReferenceType.INVOICE_CANCELLATION,
            reversalDate: cancelIntent.date,
        }));
        expect(result).toEqual({ journalEntryId: 'je-rev' });
    });
});
