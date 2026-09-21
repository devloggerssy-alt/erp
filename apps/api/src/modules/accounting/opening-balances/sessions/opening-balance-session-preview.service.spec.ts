import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OpeningBalanceSessionPreviewService } from './opening-balance-session-preview.service';
import type { JournalLineDraft } from '../../posting';

function makeLine(overrides: Record<string, unknown> = {}) {
    return {
        id: 'line-1',
        tenantId: 't1',
        sessionId: 's1',
        dimension: 'ACCOUNT',
        accountId: null,
        partyId: null,
        cashboxId: null,
        bankAccountId: null,
        currencyId: null,
        partySide: null,
        amount: 0,
        exchangeRate: 1,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        updatedAt: new Date('2026-09-01T00:00:00.000Z'),
        ...overrides,
    };
}

function makeDraft(overrides: Partial<JournalLineDraft> = {}): JournalLineDraft {
    return {
        accountId: 'acct',
        debit: 0,
        credit: 0,
        description: null,
        sortOrder: 0,
        partyId: null,
        cashboxId: null,
        bankAccountId: null,
        currencyId: null,
        amount: 0,
        exchangeRate: 1,
        ...overrides,
    };
}

function build(options: {
    lines: Array<Record<string, unknown>>;
    drafts?: JournalLineDraft[];
    buildLines?: jest.Mock;
    posted?: Array<Record<string, unknown>>;
}) {
    const repo = {
        findWithLines: jest.fn().mockResolvedValue({
            id: 's1',
            tenantId: 't1',
            number: 'OBS-0001',
            status: 'REVIEWED',
            fiscalPeriodId: 'fp1',
            createdBy: 'u1',
            lines: options.lines,
        }),
    };
    const prisma = {
        fiscalPeriod: {
            findFirst: jest.fn().mockResolvedValue({ startDate: new Date('2026-01-01T00:00:00.000Z'), status: 'OPEN' }),
        },
        chartOfAccount: {
            findMany: jest.fn().mockResolvedValue([
                { id: 'acct', code: '1000' },
                { id: 'ar', code: '1100' },
                { id: 'eq', code: '3000' },
            ]),
        },
        party: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Acme' }]) },
        currency: {
            findMany: jest.fn().mockResolvedValue([
                { id: 'usd', code: 'USD' },
                { id: 'eur', code: 'EUR' },
            ]),
        },
        journalLine: { groupBy: jest.fn().mockResolvedValue(options.posted ?? []) },
    };
    const policy = { buildLines: options.buildLines ?? jest.fn().mockResolvedValue(options.drafts ?? []) };
    const service = new OpeningBalanceSessionPreviewService(prisma as never, repo as never, policy as never);
    return { service, prisma, repo, policy };
}

describe('OpeningBalanceSessionPreviewService', () => {
    it('returns per-currency totals and the opening-equity offset', async () => {
        const lines = [
            makeLine({ dimension: 'CASHBOX', cashboxId: 'cb1', currencyId: 'usd', amount: 100, exchangeRate: 1 }),
        ];
        const drafts = [
            makeDraft({ accountId: 'acct', cashboxId: 'cb1', currencyId: 'usd', debit: 100, amount: 100 }),
            makeDraft({ accountId: 'eq', credit: 100, amount: 100, sortOrder: 1 }),
        ];
        const { service } = build({ lines, drafts });

        const result = await service.preview('t1', 's1');

        expect(result.currencyTotals).toEqual([
            { currencyId: 'usd', currencyCode: 'USD', debit: 100, credit: 0, net: 100 },
        ]);
        expect(result.offset).toEqual({ accountId: 'eq', accountCode: '3000', amount: 100 });
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0]).toMatchObject({
            dimension: 'CASHBOX',
            accountCode: '1000',
            cashboxId: 'cb1',
            currencyCode: 'USD',
            debit: 100,
            amount: 100,
        });
        expect(result.parties).toEqual([]);
    });

    it('groups party balances per currency and never mixes currencies', async () => {
        const lines = [
            makeLine({ dimension: 'PARTY', partyId: 'p1', partySide: 'AR', currencyId: 'usd', amount: 500 }),
            makeLine({ id: 'line-2', dimension: 'PARTY', partyId: 'p1', partySide: 'AR', currencyId: 'eur', amount: 200 }),
        ];
        const drafts = [
            makeDraft({ accountId: 'ar', partyId: 'p1', currencyId: 'usd', debit: 500, amount: 500 }),
            makeDraft({ accountId: 'ar', partyId: 'p1', currencyId: 'eur', debit: 200, amount: 200, sortOrder: 1 }),
            makeDraft({ accountId: 'eq', credit: 700, amount: 700, sortOrder: 2 }),
        ];
        const posted = [{ accountId: 'ar', partyId: 'p1', currencyId: 'usd', _sum: { debit: 1000, credit: 400 } }];
        const { service } = build({ lines, drafts, posted });

        const result = await service.preview('t1', 's1');

        expect(result.parties).toEqual([
            {
                partyId: 'p1',
                partyName: 'Acme',
                side: 'AR',
                accountId: 'ar',
                accountCode: '1100',
                currencyId: 'usd',
                currencyCode: 'USD',
                openingNet: 500,
                currentBalance: 600,
                resultingBalance: 1100,
            },
            {
                partyId: 'p1',
                partyName: 'Acme',
                side: 'AR',
                accountId: 'ar',
                accountCode: '1100',
                currencyId: 'eur',
                currencyCode: 'EUR',
                openingNet: 200,
                currentBalance: 0,
                resultingBalance: 200,
            },
        ]);
    });

    it('reads current party balances from posted journal lines only', async () => {
        const lines = [makeLine({ dimension: 'PARTY', partyId: 'p1', partySide: 'AR', currencyId: 'usd', amount: 500 })];
        const drafts = [
            makeDraft({ accountId: 'ar', partyId: 'p1', currencyId: 'usd', debit: 500 }),
            makeDraft({ accountId: 'eq', credit: 500, sortOrder: 1 }),
        ];
        const { service, prisma } = build({ lines, drafts });

        await service.preview('t1', 's1');

        expect(prisma.journalLine.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({
                by: ['accountId', 'partyId', 'currencyId'],
                where: expect.objectContaining({
                    tenantId: 't1',
                    partyId: { in: ['p1'] },
                    journalEntry: { status: 'POSTED' },
                }),
            }),
        );
    });

    it('exposes the same preflight failure as posting when a mapping is missing', async () => {
        const lines = [makeLine({ dimension: 'CASHBOX', cashboxId: 'cb1', currencyId: 'usd', amount: 100 })];
        const buildLines = jest
            .fn()
            .mockRejectedValue(new BadRequestException('No default Cash account configured in Financial Settings'));
        const { service } = build({ lines, buildLines });

        await expect(service.preview('t1', 's1')).rejects.toThrow(
            'No default Cash account configured in Financial Settings',
        );
    });

    it('throws NotFoundException for an unknown session', async () => {
        const { service, repo } = build({ lines: [] });
        repo.findWithLines.mockResolvedValue(null);

        await expect(service.preview('t1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws when the fiscal period is missing', async () => {
        const { service, prisma } = build({ lines: [makeLine()] });
        prisma.fiscalPeriod.findFirst.mockResolvedValue(null);

        await expect(service.preview('t1', 's1')).rejects.toThrow('Fiscal period not found');
    });
});
