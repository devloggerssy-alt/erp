import { BadRequestException } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { JournalPostingService, type PostInput, type ReverseInput } from './journal-posting.service';

type Tx = any;

function makeTx(overrides: Partial<Tx> = {}): Tx {
    return {
        journalEntry: {
            create: jest.fn().mockResolvedValue({ id: 'je-1' }),
            update: jest.fn(),
            findFirst: jest.fn(),
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

const baseInput: PostInput = {
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
        const result = await svc.post(tx, baseInput);
        expect(result.id).toBe('je-1');
        expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException when fiscal period is not OPEN', async () => {
        const tx = makeTx();
        const svc = new JournalPostingService();
        await expect(svc.post(tx, { ...baseInput, fiscalPeriodStatus: 'CLOSED' })).rejects.toBeInstanceOf(
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
        await expect(svc.post(tx, baseInput)).rejects.toBeInstanceOf(BadRequestException);
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
        await expect(svc.post(tx, baseInput)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when debit total != credit total', async () => {
        const tx = makeTx();
        const svc = new JournalPostingService();
        await expect(
            svc.post(tx, {
                ...baseInput,
                lines: [
                    { accountId: 'acc-1', debit: 100, credit: 0, description: null, sortOrder: 0 },
                    { accountId: 'acc-1', debit: 0, credit: 99, description: null, sortOrder: 1 },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when lines array is empty', async () => {
        const tx = makeTx();
        const svc = new JournalPostingService();
        await expect(svc.post(tx, { ...baseInput, lines: [] })).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('JournalPostingService.reverse', () => {
    function makeTxWithOriginal(lines: any[], overrides: Partial<any> = {}): Tx {
        return {
            journalEntry: {
                create: jest.fn().mockResolvedValue({ id: 'je-rev' }),
                update: jest.fn(),
                findFirst: jest
                    .fn()
                    .mockResolvedValue({ id: 'je-orig', tenantId: 't1', number: 'JE-1', lines }),
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

    const baseReverse: ReverseInput = {
        tenantId: 't1',
        number: 'JE-2',
        originalEntryId: 'je-orig',
        referenceType: ReferenceType.INVOICE_CANCELLATION,
        referenceId: 'inv-1',
        description: 'Reversal',
        exchangeRate: 1,
        userId: 'u-1',
        reversalDate: new Date('2026-07-16'),
        fiscalPeriodId: 'fp-1',
        fiscalPeriodStatus: 'OPEN',
    };

    it('throws when original entry is missing', async () => {
        const tx = makeTxWithOriginal([], {
            journalEntry: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
        });
        const svc = new JournalPostingService();
        await expect(svc.reverse(tx, baseReverse)).rejects.toBeInstanceOf(BadRequestException);
        expect(tx.journalEntry.create).not.toHaveBeenCalled();
    });

    it('swaps debit/credit from each original line and posts a reversal with reversalOfId', async () => {
        const tx = makeTxWithOriginal([
            { accountId: 'acc-1', debit: 100, credit: 0, description: 'sale', sortOrder: 0, partyId: 'p1' },
            { accountId: 'acc-1', debit: 0, credit: 100, description: null, sortOrder: 1, partyId: null },
        ]);
        const svc = new JournalPostingService();
        const result = await svc.reverse(tx, baseReverse);
        expect(result.id).toBe('je-rev');
        expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
        const createArg = tx.journalEntry.create.mock.calls[0][0].data;
        expect(createArg.reversalOfId).toBe('je-orig');
        expect(createArg.reversalDate).toEqual(baseReverse.reversalDate);
        const lines = createArg.lines.create;
        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatchObject({ accountId: 'acc-1', debit: 0, credit: 100, partyId: 'p1' });
        expect(lines[1]).toMatchObject({ accountId: 'acc-1', debit: 100, credit: 0, partyId: null });
    });

    it('throws when fiscal period is not OPEN', async () => {
        const tx = makeTxWithOriginal([
            { accountId: 'acc-1', debit: 100, credit: 0, description: null, sortOrder: 0 },
            { accountId: 'acc-1', debit: 0, credit: 100, description: null, sortOrder: 1 },
        ]);
        const svc = new JournalPostingService();
        await expect(svc.reverse(tx, { ...baseReverse, fiscalPeriodStatus: 'CLOSED' })).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });
});