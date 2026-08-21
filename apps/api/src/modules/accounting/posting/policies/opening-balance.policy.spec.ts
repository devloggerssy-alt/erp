import { BadRequestException } from '@nestjs/common';
import { OpeningBalancePolicy } from './opening-balance.policy';
import type { OpeningBalancePostedIntent } from '../contracts/posting-intent';

function build(settings: Record<string, unknown> = { defaultOpeningEquityAccountId: 'oe' }, accounts: any[] = []) {
    const financialSettingsService = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    const tx = { chartOfAccount: { findMany: jest.fn().mockResolvedValue(accounts) } } as any;
    return { policy: new OpeningBalancePolicy(financialSettingsService), tx };
}

const ACCOUNTS = [
    { id: 'cash', code: 'cash', type: 'ASSET', isPostable: true, isActive: true, deletedAt: null },
    { id: 'loan', code: 'loan', type: 'LIABILITY', isPostable: true, isActive: true, deletedAt: null },
    { id: 'oe', code: 'oe', type: 'EQUITY', isPostable: true, isActive: true, deletedAt: null },
];

const baseIntent: OpeningBalancePostedIntent = {
    kind: 'OPENING_BALANCE_POSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-01-01'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'opening-balance-1',
    description: 'Opening balances',
    entries: [{ accountId: 'cash', amount: 1000 }],
};

describe('OpeningBalancePolicy.buildLines', () => {
    it('a positive ASSET entry debits the account and credits the offset to Opening Equity', async () => {
        const { policy, tx } = build(undefined, ACCOUNTS);
        const lines = await policy.buildLines(tx, baseIntent);
        expect(lines).toEqual([
            {
                accountId: 'cash',
                debit: 1000,
                credit: 0,
                description: 'Opening balance - cash',
                sortOrder: 0,
                cashboxId: null,
                bankAccountId: null,
                currencyId: null,
                amount: 1000,
                exchangeRate: 1,
            },
            {
                accountId: 'oe',
                debit: 0,
                credit: 1000,
                description: 'Opening balance offset',
                sortOrder: 1,
                amount: 1000,
                exchangeRate: 1,
            },
        ]);
    });

    it('a LIABILITY entry credits the account; already-balanced entries need no offset', async () => {
        const { policy, tx } = build(undefined, ACCOUNTS);
        const lines = await policy.buildLines(tx, {
            ...baseIntent,
            entries: [
                { accountId: 'cash', amount: 1000 },
                { accountId: 'loan', amount: 1000 },
            ],
        });
        expect(lines).toEqual([
            {
                accountId: 'cash',
                debit: 1000,
                credit: 0,
                description: 'Opening balance - cash',
                sortOrder: 0,
                cashboxId: null,
                bankAccountId: null,
                currencyId: null,
                amount: 1000,
                exchangeRate: 1,
            },
            {
                accountId: 'loan',
                debit: 0,
                credit: 1000,
                description: 'Opening balance - loan',
                sortOrder: 1,
                cashboxId: null,
                bankAccountId: null,
                currencyId: null,
                amount: 1000,
                exchangeRate: 1,
            },
        ]);
    });

    it('rejects when no opening-equity account is configured', async () => {
        const { policy, tx } = build({}, ACCOUNTS);
        await expect(policy.buildLines(tx, baseIntent)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an entry against a non ASSET/LIABILITY/EQUITY account', async () => {
        const { policy, tx } = build(undefined, [...ACCOUNTS, { id: 'rev', code: 'rev', type: 'REVENUE', isPostable: true, isActive: true, deletedAt: null }]);
        await expect(
            policy.buildLines(tx, { ...baseIntent, entries: [{ accountId: 'rev', amount: 500 }] }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
