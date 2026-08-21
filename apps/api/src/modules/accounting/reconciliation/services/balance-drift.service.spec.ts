import { BalanceDriftService } from './balance-drift.service';

/**
 * The report's value is that it stays quiet when things are fine and speaks up
 * when they are not — so both directions are asserted for every check.
 */

interface PrismaStub {
    cashboxes?: Array<{ id: string; code: string; balance: number }>;
    payments?: Array<{ cashboxId: string; type: string; _sum: { amount: number } }>;
    expenses?: Array<{ cashboxId: string; _sum: { totalAmount: number } }>;
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
        payment: { groupBy: async () => stub.payments ?? [] },
        expense: { groupBy: async () => stub.expenses ?? [] },
        stockBalance: { findMany: async () => stub.stockBalances ?? [] },
        stockMovement: { groupBy: async () => stub.stockMovements ?? [] },
        journalLine: { groupBy: async () => stub.journalLines ?? [] },
        journalEntry: { findMany: async () => stub.journalEntries ?? [] },
        financialSetting: { findFirst: async () => stub.financialSetting ?? null },
        bankAccount: { findMany: async () => stub.bankAccounts ?? [] },
    };
    return new BalanceDriftService(prisma as never);
}

describe('BalanceDriftService — cashbox balance', () => {
    it('is quiet when the cache matches receipts − payments − expenses', async () => {
        const report = await makeService({
            cashboxes: [{ id: 'cb1', code: 'CASH-USD', balance: 700 }],
            payments: [
                { cashboxId: 'cb1', type: 'RECEIPT', _sum: { amount: 1000 } },
                { cashboxId: 'cb1', type: 'PAYMENT', _sum: { amount: 200 } },
            ],
            expenses: [{ cashboxId: 'cb1', _sum: { totalAmount: 100 } }],
        }).getReport('t1');

        expect(report.cashboxes).toEqual([]);
        expect(report.clean).toBe(true);
    });

    it('reports the signed difference when the cache is stale', async () => {
        const report = await makeService({
            cashboxes: [{ id: 'cb1', code: 'CASH-USD', balance: 950 }],
            payments: [{ cashboxId: 'cb1', type: 'RECEIPT', _sum: { amount: 1000 } }],
            expenses: [{ cashboxId: 'cb1', _sum: { totalAmount: 100 } }],
        }).getReport('t1');

        expect(report.cashboxes).toEqual([
            { cashboxId: 'cb1', code: 'CASH-USD', cachedBalance: 950, derivedBalance: 900, difference: 50 },
        ]);
        expect(report.clean).toBe(false);
    });

    it('treats ADJUSTMENT as an outflow, like PAYMENT', async () => {
        const report = await makeService({
            cashboxes: [{ id: 'cb1', code: 'CASH-USD', balance: -50 }],
            payments: [{ cashboxId: 'cb1', type: 'ADJUSTMENT', _sum: { amount: 50 } }],
        }).getReport('t1');

        expect(report.cashboxes).toEqual([]);
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
