import { BalanceDriftService } from './balance-drift.service';

/**
 * The report's value is that it stays quiet when things are fine and speaks up
 * when they are not — so both directions are asserted for every check.
 */

interface PrismaStub {
    cashboxes?: Array<{ id: string; code: string; balance: number }>;
    /** Rows returned by the cashbox / bank-account subledger $queryRaw. */
    cashboxSubledger?: Array<{ dimensionId: string; balance: string }>;
    bankAccountSubledger?: Array<{ dimensionId: string; balance: string }>;
    stockBalances?: Array<{ warehouseId: string; itemId: string; quantity: number }>;
    stockMovements?: Array<{ warehouseId: string; itemId: string; _sum: { quantity: number } }>;
    journalLines?: Array<{ journalEntryId: string; _sum: { debit: number; credit: number } }>;
    journalEntries?: Array<{ id: string; number: string }>;
    financialSetting?: {
        defaultCashAccountId?: string | null;
        defaultBankAccountId?: string | null;
        defaultReceivableAccountId?: string | null;
        defaultPayableAccountId?: string | null;
        defaultInventoryAccountId?: string | null;
    };
    bankAccounts?: Array<{ id: string; code: string; balance: number }>;
    inventoryGl?: { debit: number; credit: number };
    stockValuation?: string | null;
    fxLines?: Array<{ journalLineId: string; journalEntryNumber: string; amount: string; exchangeRate: string; baseAmount: string }>;
    /** When set, the party-subledger groupBy returns nothing, so GL and subledger differ. */
    partyGlOnly?: boolean;
}

function makeService(stub: PrismaStub = {}): BalanceDriftService {
    const prisma = {
        cashbox: { findMany: async () => stub.cashboxes ?? [] },
        stockBalance: { findMany: async () => stub.stockBalances ?? [] },
        stockMovement: { groupBy: async () => stub.stockMovements ?? [] },
        journalLine: {
            groupBy: async (args: { where?: { partyId?: unknown } }) =>
                stub.partyGlOnly === true && args.where?.partyId !== undefined ? [] : stub.journalLines ?? [],
            aggregate: async () => ({ _sum: stub.inventoryGl ?? { debit: 0, credit: 0 } }),
        },
        journalEntry: { findMany: async () => stub.journalEntries ?? [] },
        financialSetting: { findFirst: async () => stub.financialSetting ?? null },
        bankAccount: { findMany: async () => stub.bankAccounts ?? [] },
        $queryRaw: async (strings: TemplateStringsArray) => {
            const sql = strings.join('?');
            if (sql.includes('jl.cashbox_id IS NOT NULL')) return stub.cashboxSubledger ?? [];
            if (sql.includes('jl.bank_account_id IS NOT NULL')) return stub.bankAccountSubledger ?? [];
            if (sql.includes('FROM stock_movements')) return [{ value: stub.stockValuation ?? null }];
            if (sql.includes('ROUND(ABS(jl.amount)')) return stub.fxLines ?? [];
            return [];
        },
    };
    return new BalanceDriftService(prisma as never);
}

describe('BalanceDriftService — check 2: cashbox subledger vs Cashbox.balance', () => {
    it('is quiet when the projection equals the signed transaction-currency subledger', async () => {
        const report = await makeService({
            cashboxes: [{ id: 'cb1', code: 'CASH-USD', balance: 700 }],
            cashboxSubledger: [{ dimensionId: 'cb1', balance: '700.0000' }],
        }).getReport('t1');

        expect(report.cashboxes).toEqual([]);
        expect(report.clean).toBe(true);
    });

    it('reports the signed difference when the projection is stale', async () => {
        const report = await makeService({
            cashboxes: [{ id: 'cb1', code: 'CASH-USD', balance: 950 }],
            cashboxSubledger: [{ dimensionId: 'cb1', balance: '900' }],
        }).getReport('t1');

        expect(report.cashboxes).toEqual([
            { cashboxId: 'cb1', code: 'CASH-USD', cachedBalance: 950, derivedBalance: 900, difference: 50 },
        ]);
        expect(report.clean).toBe(false);
    });

    it('treats a cashbox with no posted lines as a zero subledger', async () => {
        const report = await makeService({
            cashboxes: [{ id: 'cb1', code: 'CASH-USD', balance: 10 }],
        }).getReport('t1');

        expect(report.cashboxes).toEqual([
            { cashboxId: 'cb1', code: 'CASH-USD', cachedBalance: 10, derivedBalance: 0, difference: 10 },
        ]);
    });
});

describe('BalanceDriftService — check 3: bank subledger vs BankAccount.balance', () => {
    it('compares in transaction currency, so a foreign-currency account is not flagged for its base value', async () => {
        const report = await makeService({
            bankAccounts: [{ id: 'ba1', code: 'BANK-EUR', balance: 100 }],
            bankAccountSubledger: [{ dimensionId: 'ba1', balance: '100' }],
            journalLines: [{ journalEntryId: 'je1', _sum: { debit: 110, credit: 0 } } as never],
        }).getReport('t1');

        expect(report.bankAccounts).toEqual([]);
    });

    it('reports a stale bank projection', async () => {
        const report = await makeService({
            bankAccounts: [{ id: 'ba1', code: 'BANK-EUR', balance: 120 }],
            bankAccountSubledger: [{ dimensionId: 'ba1', balance: '100' }],
        }).getReport('t1');

        expect(report.bankAccounts).toEqual([
            { bankAccountId: 'ba1', code: 'BANK-EUR', cachedBalance: 120, derivedBalance: 100, difference: 20 },
        ]);
    });
});

describe('BalanceDriftService — stock balance', () => {
    it('is quiet when quantity matches the movement sum', async () => {
        const report = await makeService({
            stockBalances: [{ warehouseId: 'w1', itemId: 'i1', quantity: 40 }],
            stockMovements: [{ warehouseId: 'w1', itemId: 'i1', _sum: { quantity: 40 } }],
        }).getReport('t1');

        expect(report.stockBalances).toEqual([]);
    });

    it('reports a stale quantity', async () => {
        const report = await makeService({
            stockBalances: [{ warehouseId: 'w1', itemId: 'i1', quantity: 40 }],
            stockMovements: [{ warehouseId: 'w1', itemId: 'i1', _sum: { quantity: 38 } }],
        }).getReport('t1');

        expect(report.stockBalances).toEqual([
            { warehouseId: 'w1', itemId: 'i1', cachedQuantity: 40, derivedQuantity: 38, difference: 2 },
        ]);
    });

    it('reports movements that have no StockBalance row at all', async () => {
        const report = await makeService({
            stockBalances: [],
            stockMovements: [{ warehouseId: 'w1', itemId: 'orphan', _sum: { quantity: 12 } }],
        }).getReport('t1');

        expect(report.stockBalances).toEqual([
            { warehouseId: 'w1', itemId: 'orphan', cachedQuantity: 0, derivedQuantity: 12, difference: -12 },
        ]);
    });
});

describe('BalanceDriftService — journal entry balance', () => {
    it('is quiet when every posted entry balances', async () => {
        const report = await makeService({
            journalLines: [{ journalEntryId: 'je1', _sum: { debit: 1000, credit: 1000 } }],
        }).getReport('t1');

        expect(report.unbalancedEntries).toEqual([]);
    });

    it('reports an unbalanced entry with its number', async () => {
        const report = await makeService({
            journalLines: [{ journalEntryId: 'je1', _sum: { debit: 1000, credit: 999.5 } }],
            journalEntries: [{ id: 'je1', number: 'JE-000042' }],
        }).getReport('t1');

        expect(report.unbalancedEntries).toEqual([
            { journalEntryId: 'je1', number: 'JE-000042', totalDebit: 1000, totalCredit: 999.5, difference: 0.5 },
        ]);
    });

    it('ignores differences below the Decimal(18,4) tolerance', async () => {
        const report = await makeService({
            journalLines: [{ journalEntryId: 'je1', _sum: { debit: 1000, credit: 1000.00001 } }],
        }).getReport('t1');

        expect(report.unbalancedEntries).toEqual([]);
    });
});

describe('BalanceDriftService — report envelope', () => {
    it('is clean with no data, and always states what it did not check', async () => {
        const report = await makeService().getReport('t1');

        expect(report.clean).toBe(true);
        expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        // An empty report must not be read as "everything verified".
        expect(report.notChecked.length).toBeGreaterThan(0);
        expect(report.notChecked.join(' ')).toContain('averageCost');
    });

    it('is not clean when any single section has a finding', async () => {
        const report = await makeService({
            stockBalances: [{ warehouseId: 'w1', itemId: 'i1', quantity: 1 }],
            stockMovements: [],
        }).getReport('t1');

        expect(report.clean).toBe(false);
    });
});

describe('BalanceDriftService — check 6: inventory GL vs stock valuation', () => {
    it('is skipped (and says so) when no Inventory account is configured', async () => {
        const report = await makeService({ stockValuation: '500' }).getReport('t1');
        expect(report.inventoryValuation).toEqual([]);
        expect(report.notChecked.join(' ')).toContain('Check 6');
    });

    it('is quiet within the per-document rounding tolerance', async () => {
        const report = await makeService({
            financialSetting: { defaultInventoryAccountId: 'inv' },
            inventoryGl: { debit: 1000, credit: 400 },
            stockValuation: '599.996',
        }).getReport('t1');
        expect(report.inventoryValuation).toEqual([]);
        expect(report.notChecked.join(' ')).not.toContain('Check 6');
    });

    it('reports a GL/stock divergence', async () => {
        const report = await makeService({
            financialSetting: { defaultInventoryAccountId: 'inv' },
            inventoryGl: { debit: 1000, credit: 0 },
            stockValuation: '750.5',
        }).getReport('t1');
        expect(report.inventoryValuation).toEqual([
            { inventoryAccountId: 'inv', glBalance: 1000, stockValuation: 750.5, difference: 249.5 },
        ]);
        expect(report.clean).toBe(false);
    });

    it('treats no movements as zero valuation', async () => {
        const report = await makeService({
            financialSetting: { defaultInventoryAccountId: 'inv' },
            inventoryGl: { debit: 0, credit: 0 },
            stockValuation: null,
        }).getReport('t1');
        expect(report.inventoryValuation).toEqual([]);
    });
});

describe('BalanceDriftService — check 8: txn amount × rate = base', () => {
    it('is quiet when the query finds no offending line', async () => {
        const report = await makeService().getReport('t1');
        expect(report.multiCurrencyLines).toEqual([]);
    });

    it('classifies a wrong base as RATE_MISMATCH', async () => {
        const report = await makeService({
            fxLines: [{ journalLineId: 'jl1', journalEntryNumber: 'JE-000007', amount: '100.0000', exchangeRate: '1.100000', baseAmount: '100.0000' }],
        }).getReport('t1');
        expect(report.multiCurrencyLines).toEqual([
            {
                journalLineId: 'jl1',
                journalEntryNumber: 'JE-000007',
                amount: 100,
                exchangeRate: 1.1,
                baseAmount: 100,
                expectedBaseAmount: 110,
                difference: -10,
                reason: 'RATE_MISMATCH',
            },
        ]);
        expect(report.clean).toBe(false);
    });

    it('classifies a legacy line with no transaction amount as MISSING_AMOUNT', async () => {
        const report = await makeService({
            fxLines: [{ journalLineId: 'jl2', journalEntryNumber: 'JE-000001', amount: '0.0000', exchangeRate: '1.000000', baseAmount: '250.0000' }],
        }).getReport('t1');
        expect(report.multiCurrencyLines[0]).toMatchObject({ reason: 'MISSING_AMOUNT', expectedBaseAmount: 0, difference: 250 });
    });
});

describe('BalanceDriftService — checks 4/5: party subledger side', () => {
    it('labels each finding AR or AP by its control account', async () => {
        // GL side has a USD balance, party-subledger side is empty → one finding per control account.
        const report = await makeService({
            financialSetting: { defaultReceivableAccountId: 'ar', defaultPayableAccountId: 'ap' },
            partyGlOnly: true,
            journalLines: [{ currencyId: 'USD', _sum: { debit: 10, credit: 0 } } as never],
        }).getReport('t1');
        expect(report.partySubledgers.map((p) => [p.controlAccountId, p.side])).toEqual(
            expect.arrayContaining([
                ['ar', 'AR'],
                ['ap', 'AP'],
            ]),
        );
    });
});
