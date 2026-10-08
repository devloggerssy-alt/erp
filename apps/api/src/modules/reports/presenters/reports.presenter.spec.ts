import { ReportsPresenter, type InvoiceRow, type PartyStatementInput, type StockBalanceRow } from './reports.presenter';

function makePresenter(locale: 'en' | 'ar' = 'en'): ReportsPresenter {
    return new ReportsPresenter({
        resolve: (field: { en?: string; ar?: string } | null | undefined, fallback = '') =>
            field?.[locale] ?? field?.ar ?? fallback,
    } as never);
}

const invoiceRow = {
    id: 'inv-1',
    number: 'SI-001',
    date: new Date('2026-02-03T10:00:00.000Z'),
    total: '150.75',
    partyId: 'party-1',
    party: { name: 'Aleppo Electronics', code: 'C-1' },
} as unknown as InvoiceRow;

describe('ReportsPresenter.toStockBalance', () => {
    it('flattens rows, converts Decimals to numbers, resolves the localized name and ISO-dates', () => {
        const rows = [
            {
                itemId: 'item-1',
                warehouseId: 'wh-1',
                quantity: '50.0000',
                averageCost: '12.5000',
                updatedAt: new Date('2026-01-02T03:04:05.000Z'),
                item: { code: 'WGT', name: 'Widget' },
                warehouse: { code: 'MAIN', name: { en: 'Main Warehouse', ar: 'المستودع الرئيسي' } },
            },
        ] as unknown as StockBalanceRow[];

        expect(makePresenter().toStockBalance(rows)).toEqual([
            {
                itemId: 'item-1',
                itemName: 'Widget',
                itemCode: 'WGT',
                warehouseId: 'wh-1',
                warehouseName: 'Main Warehouse',
                warehouseCode: 'MAIN',
                quantity: 50,
                averageCost: 12.5,
                updatedAt: '2026-01-02T03:04:05.000Z',
            },
        ]);
    });

    it('resolves the warehouse name for the request locale with an Arabic fallback', () => {
        const rows = [
            {
                itemId: 'item-1',
                warehouseId: 'wh-1',
                quantity: '1',
                averageCost: '1',
                updatedAt: new Date('2026-01-02T03:04:05.000Z'),
                item: { code: 'WGT', name: 'Widget' },
                warehouse: { code: 'MAIN', name: { ar: 'المستودع الرئيسي' } },
            },
        ] as unknown as StockBalanceRow[];

        expect(makePresenter('en').toStockBalance(rows)[0]!.warehouseName).toBe('المستودع الرئيسي');
    });
});

describe('ReportsPresenter.toInvoiceSummary', () => {
    it('maps invoices to the slim report shape with numeric totals and ISO dates', () => {
        expect(makePresenter().toInvoiceSummary([invoiceRow])).toEqual([
            {
                id: 'inv-1',
                number: 'SI-001',
                date: '2026-02-03T10:00:00.000Z',
                total: 150.75,
                partyId: 'party-1',
                party: { name: 'Aleppo Electronics', code: 'C-1' },
            },
        ]);
    });
});

describe('ReportsPresenter.toPartyStatement', () => {
    it('maps the party, invoices and payments and keeps the totals', () => {
        const statement = {
            party: { id: 'party-1', name: 'Aleppo Electronics', code: 'C-1' },
            invoices: [invoiceRow],
            payments: [
                { id: 'pay-1', date: new Date('2026-02-04T09:30:00.000Z'), amount: '100.25' },
            ],
            totalInvoiced: 150.75,
            totalPaid: 100.25,
            balance: 50.5,
        } as unknown as PartyStatementInput;

        expect(makePresenter().toPartyStatement(statement)).toEqual({
            party: { id: 'party-1', name: 'Aleppo Electronics', code: 'C-1' },
            invoices: [
                {
                    id: 'inv-1',
                    number: 'SI-001',
                    date: '2026-02-03T10:00:00.000Z',
                    total: 150.75,
                    partyId: 'party-1',
                    party: { name: 'Aleppo Electronics', code: 'C-1' },
                },
            ],
            payments: [{ id: 'pay-1', date: '2026-02-04T09:30:00.000Z', amount: 100.25 }],
            totalInvoiced: 150.75,
            totalPaid: 100.25,
            balance: 50.5,
        });
    });

    it('passes through a missing party as null', () => {
        const statement = {
            party: null,
            invoices: [],
            payments: [],
            totalInvoiced: 0,
            totalPaid: 0,
            balance: 0,
        } as unknown as PartyStatementInput;

        expect(makePresenter().toPartyStatement(statement).party).toBeNull();
    });
});
