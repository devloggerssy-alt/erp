import {
    buildCogsJournalLines,
    buildStockCountVarianceLines,
    buildOpeningBalanceLines,
} from './inventory-journal';

const sum = (ls: { debit: number; credit: number }[]) => ({
    d: ls.reduce((s, l) => s + l.debit, 0),
    c: ls.reduce((s, l) => s + l.credit, 0),
});

describe('buildCogsJournalLines', () => {
    it('debits COGS and credits Inventory, balanced', () => {
        const ls = buildCogsJournalLines({ cogsAccountId: 'cogs', inventoryAccountId: 'inv', amount: 250 });
        expect(ls[0]).toEqual({ accountId: 'cogs', debit: 250, credit: 0, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'inv', debit: 0, credit: 250, description: null, sortOrder: 1 });
        expect(sum(ls)).toEqual({ d: 250, c: 250 });
    });
    it('swaps sides when reverse=true', () => {
        const ls = buildCogsJournalLines({ cogsAccountId: 'cogs', inventoryAccountId: 'inv', amount: 250 }, { reverse: true });
        expect(ls[0]).toEqual({ accountId: 'cogs', debit: 0, credit: 250, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'inv', debit: 250, credit: 0, description: null, sortOrder: 1 });
    });
});

describe('buildStockCountVarianceLines', () => {
    it('surplus: debits Inventory, credits Adjustment', () => {
        const ls = buildStockCountVarianceLines({ inventoryAccountId: 'inv', adjustmentAccountId: 'adj', netAmount: 80 });
        expect(ls[0]).toEqual({ accountId: 'inv', debit: 80, credit: 0, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'adj', debit: 0, credit: 80, description: null, sortOrder: 1 });
        expect(sum(ls)).toEqual({ d: 80, c: 80 });
    });
    it('shortage: debits Adjustment, credits Inventory', () => {
        const ls = buildStockCountVarianceLines({ inventoryAccountId: 'inv', adjustmentAccountId: 'adj', netAmount: -80 });
        expect(ls[0]).toEqual({ accountId: 'inv', debit: 0, credit: 80, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'adj', debit: 80, credit: 0, description: null, sortOrder: 1 });
    });
});

describe('buildOpeningBalanceLines', () => {
    it('debits Inventory, credits Opening Equity, balanced', () => {
        const ls = buildOpeningBalanceLines({ inventoryAccountId: 'inv', openingEquityAccountId: 'oe', amount: 1200 });
        expect(ls[0]).toEqual({ accountId: 'inv', debit: 1200, credit: 0, description: null, sortOrder: 0 });
        expect(ls[1]).toEqual({ accountId: 'oe', debit: 0, credit: 1200, description: null, sortOrder: 1 });
        expect(sum(ls)).toEqual({ d: 1200, c: 1200 });
    });
});
