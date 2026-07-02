import { buildInvoiceJournalLines, InvoiceJournalInput } from './invoice-journal';

const base: InvoiceJournalInput = {
    direction: 'PURCHASE',
    netAmount: 1000,
    taxAmount: 0,
    total: 1000,
    exchangeRate: 1,
    receivableAccountId: 'ar',
    payableAccountId: 'ap',
    salesAccountId: 'sales',
    purchaseAccountId: 'purchase',
    taxAccountId: null,
    partyId: 'party-1',
};
const sum = (ls: { debit: number; credit: number }[]) => ({
    d: ls.reduce((s, l) => s + l.debit, 0),
    c: ls.reduce((s, l) => s + l.credit, 0),
});

describe('buildInvoiceJournalLines — purchase inventory split', () => {
    it('capitalizes the stock portion to Inventory and the rest to Purchase', () => {
        const ls = buildInvoiceJournalLines({ ...base, inventoryAmount: 700, inventoryAccountId: 'inv' });
        const inv = ls.find((l) => l.accountId === 'inv');
        const pur = ls.find((l) => l.accountId === 'purchase');
        const ap = ls.find((l) => l.accountId === 'ap');
        expect(inv).toMatchObject({ debit: 700, credit: 0 });
        expect(pur).toMatchObject({ debit: 300, credit: 0 });
        expect(ap).toMatchObject({ debit: 0, credit: 1000, partyId: 'party-1' });
        expect(sum(ls)).toEqual({ d: 1000, c: 1000 });
    });

    it('routes all net to Inventory when the whole invoice is stock', () => {
        const ls = buildInvoiceJournalLines({ ...base, inventoryAmount: 1000, inventoryAccountId: 'inv' });
        expect(ls.find((l) => l.accountId === 'purchase')).toBeUndefined();
        expect(ls.find((l) => l.accountId === 'inv')).toMatchObject({ debit: 1000 });
        expect(sum(ls)).toEqual({ d: 1000, c: 1000 });
    });

    it('falls back to all-Purchase when no inventory portion is given', () => {
        const ls = buildInvoiceJournalLines(base);
        expect(ls.find((l) => l.accountId === 'inv')).toBeUndefined();
        expect(ls.find((l) => l.accountId === 'purchase')).toMatchObject({ debit: 1000 });
        expect(sum(ls)).toEqual({ d: 1000, c: 1000 });
    });

    it('reverses inventory + purchase sides when reverse=true', () => {
        const ls = buildInvoiceJournalLines({ ...base, inventoryAmount: 700, inventoryAccountId: 'inv' }, { reverse: true });
        expect(ls.find((l) => l.accountId === 'inv')).toMatchObject({ debit: 0, credit: 700 });
        expect(ls.find((l) => l.accountId === 'ap')).toMatchObject({ debit: 1000, credit: 0 });
        expect(sum(ls)).toEqual({ d: 1000, c: 1000 });
    });
});
