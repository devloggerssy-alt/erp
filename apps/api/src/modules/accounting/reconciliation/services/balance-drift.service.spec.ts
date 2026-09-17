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
    };
    bankAccounts?: Array<{ id: string; code: string; balance: number }>;
}

function makeService(stub: PrismaStub = {}): BalanceDriftService {
    const prisma = {
        cashbox: { findMany: async () => stub.cashboxes ?? [] },
        stockBalance: { findMany: async () => stub.stockBalances ?? [] },
        stockMovement: { groupBy: async () => stub.stockMovements ?? [] },
        journalLine: { groupBy: async () => stub.journalLines ?? [] },
        journalEntry: { findMany: async () => stub.journalEntries ?? [] },
        financialSetting: { findFirst: async () => stub.financialSetting ?? null },
        bankAccount: { findMany: async () => stub.bankAccounts ?? [] },
        $queryRaw: async (strings: TemplateStringsArray) => {
            const sql = strings.join('?');
            if (sql.includes('jl.cashbox_id IS NOT NULL')) return stub.cashboxSubledger ?? [];
            if (sql.includes('jl.bank_account_id IS NOT NULL')) return stub.bankAccountSubledger ?? [];
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
