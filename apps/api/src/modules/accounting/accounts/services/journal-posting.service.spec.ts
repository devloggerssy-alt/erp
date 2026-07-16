import { BadRequestException } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { JournalPostingService } from './journal-posting.service';

type Tx = any;

function makeTx(overrides: Partial<Tx> = {}): Tx {
    return {
        journalEntry: {
            create: jest.fn().mockResolvedValue({ id: 'je-1' }),
        },
        chartOfAccount: {
            findMany: jest
                .fn()
                .mockResolvedValue([
                    { id: 'acc-1', code: '1110', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null },
                ]),
        },
        ...overrides,
    } as Tx;
}

const baseInput = {
    tenantId: 't1',
    number: 'JE-1',
    date: new Date('2026-07-16'),
    fiscalPeriodId: 'fp-1',
    fiscalPeriodStatus: 'OPEN',
    referenceType: ReferenceType.INVOICE,
    referenceId: 'inv-1',
    description: 'Sale',
    exchangeRate: 1,
    userId: 'u-1',
    lines: [
        { accountId: 'acc-1', debit: 100, credit: 0, description: null, sortOrder: 0 },
        { accountId: 'acc-1', debit: 0, credit: 100, description: null, sortOrder: 1 },
    ],
};

describe('JournalPostingService.post', () => {
    it('creates the journal entry when period OPEN and lines postable + balanced', async () => {
        const tx = makeTx();
        const svc = new JournalPostingService();
        const result = await svc.post(tx, baseInput as any);
        expect(result.id).toBe('je-1');
        expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException when fiscal period is not OPEN', async () => {
        const tx = makeTx();
        const svc = new JournalPostingService();
        await expect(svc.post(tx, { ...baseInput, fiscalPeriodStatus: 'CLOSED' } as any)).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(tx.journalEntry.create).not.toHaveBeenCalled();
    });

    it('throws when target account is not postable', async () => {
        const tx = makeTx({
            chartOfAccount: {
                findMany: jest
                    .fn()
                    .mockResolvedValue([
                        { id: 'acc-1', code: '1110', type: 'ASSET', isPostable: false, isContra: false, deletedAt: null },
                    ]),
            },
        });
        const svc = new JournalPostingService();
        await expect(svc.post(tx, baseInput as any)).rejects.toBeInstanceOf(BadRequestException);
        expect(tx.journalEntry.create).not.toHaveBeenCalled();
    });

    it('throws when target account is soft-deleted', async () => {
        const tx = makeTx({
            chartOfAccount: {
                findMany: jest
                    .fn()
                    .mockResolvedValue([
                        { id: 'acc-1', code: '1110', type: 'ASSET', isPostable: true, isContra: false, deletedAt: new Date() },
                    ]),
            },
        });
        const svc = new JournalPostingService();
        await expect(svc.post(tx, baseInput as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when debit total != credit total', async () => {
        const tx = makeTx();
        const svc = new JournalPostingService();
        await expect(
            svc.post(
                tx,
                {
                    ...baseInput,
                    lines: [
                        { accountId: 'acc-1', debit: 100, credit: 0, description: null, sortOrder: 0 },
                        { accountId: 'acc-1', debit: 0, credit: 99, description: null, sortOrder: 1 },
                    ],
                } as any,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when lines array is empty', async () => {
        const tx = makeTx();
        const svc = new JournalPostingService();
        await expect(svc.post(tx, { ...baseInput, lines: [] } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
});