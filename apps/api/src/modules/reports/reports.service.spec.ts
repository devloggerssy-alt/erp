import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import { ReportsPresenter } from './presenters/reports.presenter';

type Rate = { exchangeRate: number };

const invoice = (total: number, exchangeRate: number, date = new Date('2026-06-01T00:00:00.000Z')) => ({
    id: `inv-${total}-${exchangeRate}`,
    number: 'INV',
    date,
    total,
    exchangeRate,
    partyId: 'p1',
    party: null,
});

interface PrismaStub {
    expenseItems?: Array<{ accountId: string; amount: number; expense: Rate }>;
    expenses?: Array<{ totalAmount: number; exchangeRate: number }>;
    accounts?: Array<{ id: string; name: unknown }>;
    salesInvoices?: Array<ReturnType<typeof invoice>>;
    purchaseInvoices?: Array<ReturnType<typeof invoice>>;
    invoiceLines?: Array<{ itemId: string; quantity: number; total: number; invoice: Rate }>;
    items?: Array<{ id: string; name: string; code: string }>;
}

function makeService(stub: PrismaStub = {}): ReportsService {
    const prisma = {
        expenseItem: {
            findMany: async () => stub.expenseItems ?? [],
        },
        expense: {
            findMany: async () => stub.expenses ?? [],
        },
        chartOfAccount: {
            findMany: async () => stub.accounts ?? [],
        },
        invoice: {
            findMany: async (args: { where: { invoiceType: { direction: string } } }) =>
                args.where.invoiceType.direction === 'SALE'
                    ? (stub.salesInvoices ?? [])
                    : (stub.purchaseInvoices ?? []),
        },
        invoiceLine: {
            findMany: async () => stub.invoiceLines ?? [],
        },
        cashbox: {
            findMany: async () => [],
        },
        stockBalance: {
            count: async () => 0,
        },
        party: {
            count: async () => 0,
        },
        item: {
            findMany: async () => stub.items ?? [],
            count: async () => 0,
        },
    };
    const presenter = new ReportsPresenter({
        resolve: (field: { en?: string; ar?: string } | null | undefined, fallback = '') =>
            field?.en ?? field?.ar ?? fallback,
    } as never);
    return new ReportsService(new ReportsRepository(prisma as never), presenter);
}

describe('ReportsService.getDashboardExpenseBreakdown', () => {
    it("resolves account names and keeps descending order", async () => {
        const result = await makeService({
            expenseItems: [
                { accountId: 'acc-1', amount: 700, expense: { exchangeRate: 1 } },
                { accountId: 'acc-2', amount: 300, expense: { exchangeRate: 1 } },
            ],
            accounts: [
                { id: 'acc-1', name: { en: 'Rent', ar: 'إيجار' } },
                { id: 'acc-2', name: { en: 'Utilities', ar: 'مرافق' } },
            ],
        }).getDashboardExpenseBreakdown('t1', {});

        expect(result).toEqual([
            { accountId: 'acc-1', accountName: { en: 'Rent', ar: 'إيجار' }, total: 700 },
            { accountId: 'acc-2', accountName: { en: 'Utilities', ar: 'مرافق' }, total: 300 },
        ]);
    });

    it('converts each expense line to base currency before ranking', async () => {
        const result = await makeService({
            expenseItems: [
                { accountId: 'acc-1', amount: 700, expense: { exchangeRate: 1 } },
                { accountId: 'acc-2', amount: 1, expense: { exchangeRate: 12000 } },
            ],
            accounts: [
                { id: 'acc-1', name: { en: 'Rent', ar: 'إيجار' } },
                { id: 'acc-2', name: { en: 'Fuel (USD)', ar: 'وقود' } },
            ],
        }).getDashboardExpenseBreakdown('t1', {});

        expect(result).toEqual([
            { accountId: 'acc-2', accountName: { en: 'Fuel (USD)', ar: 'وقود' }, total: 12000 },
            { accountId: 'acc-1', accountName: { en: 'Rent', ar: 'إيجار' }, total: 700 },
        ]);
    });

    it('folds accounts beyond the top 5 into a single "other" bucket', async () => {
        const groups = Array.from({ length: 7 }, (_, i) => ({
            accountId: `acc-${i}`,
            amount: (7 - i) * 100,
            expense: { exchangeRate: 1 },
        }));
        const accounts = groups.map((g) => ({
            id: g.accountId,
            name: { en: `Account ${g.accountId}`, ar: g.accountId },
        }));

        const result = await makeService({ expenseItems: groups, accounts }).getDashboardExpenseBreakdown(
            't1',
            {},
        );

        expect(result).toHaveLength(6);
        expect(result[5]).toEqual({
            accountId: 'other',
            accountName: { en: 'Other', ar: 'أخرى' },
            total: 300, // acc-5 (200) + acc-6 (100)
        });
    });

    it('returns an empty array when there is no posted expense activity', async () => {
        const result = await makeService({}).getDashboardExpenseBreakdown('t1', {});
        expect(result).toEqual([]);
    });
});

describe('ReportsService.getDashboardTopItems', () => {
    it('resolves item names/codes for the grouped rows', async () => {
        const result = await makeService({
            invoiceLines: [
                { itemId: 'item-1', quantity: 10, total: 500, invoice: { exchangeRate: 1 } },
                { itemId: 'item-2', quantity: 4, total: 200, invoice: { exchangeRate: 1 } },
            ],
            items: [
                { id: 'item-1', name: 'Widget', code: 'WGT-1' },
                { id: 'item-2', name: 'Gadget', code: 'GDT-1' },
            ],
        }).getDashboardTopItems('t1', { limit: 5 });

        expect(result).toEqual([
            { itemId: 'item-1', itemName: 'Widget', itemCode: 'WGT-1', quantity: 10, revenue: 500 },
            { itemId: 'item-2', itemName: 'Gadget', itemCode: 'GDT-1', quantity: 4, revenue: 200 },
        ]);
    });

    it('ranks items by base-currency revenue across invoice currencies', async () => {
        const result = await makeService({
            invoiceLines: [
                { itemId: 'item-1', quantity: 10, total: 500, invoice: { exchangeRate: 1 } },
                { itemId: 'item-2', quantity: 1, total: 2, invoice: { exchangeRate: 12000 } },
                { itemId: 'item-2', quantity: 1, total: 3, invoice: { exchangeRate: 12000 } },
            ],
            items: [
                { id: 'item-1', name: 'Widget', code: 'WGT-1' },
                { id: 'item-2', name: 'Gadget', code: 'GDT-1' },
            ],
        }).getDashboardTopItems('t1', { limit: 5 });

        expect(result).toEqual([
            { itemId: 'item-2', itemName: 'Gadget', itemCode: 'GDT-1', quantity: 2, revenue: 60000 },
            { itemId: 'item-1', itemName: 'Widget', itemCode: 'WGT-1', quantity: 10, revenue: 500 },
        ]);
    });

    it('returns an empty array when there are no posted sales in range', async () => {
        const result = await makeService({}).getDashboardTopItems('t1', {});
        expect(result).toEqual([]);
    });
});

describe('ReportsService base-currency totals', () => {
    const salesInvoices = [invoice(100, 1), invoice(2, 12000)];
    const purchaseInvoices = [invoice(50, 1)];
    const expenses = [{ totalAmount: 10, exchangeRate: 1000 }];

    it('converts sales, purchases and expenses to base currency on the dashboard summary', async () => {
        const result = await makeService({ salesInvoices, purchaseInvoices, expenses }).getDashboardSummary('t1', {
            from: '2026-06-01T00:00:00.000Z',
            to: '2026-06-30T23:59:59.999Z',
        });

        expect(result.totalSales).toBe(24100);
        expect(result.totalPurchases).toBe(50);
        expect(result.totalExpenses).toBe(10000);
        expect(result.netProfit).toBe(14050);
    });

    it('converts chart sales and purchases to base currency per day', async () => {
        const day = new Date('2026-06-01T00:00:00.000Z');
        const result = await makeService({
            salesInvoices: [invoice(2, 12000, day)],
            purchaseInvoices: [invoice(50, 1, day)],
        }).getDashboardChartData('t1', {
            from: '2026-06-01T00:00:00.000Z',
            to: '2026-06-30T23:59:59.999Z',
        });

        expect(result).toEqual([{ date: '2026-06-01', sales: 24000, purchases: 50 }]);
    });

    it('converts sales total to base currency in the sales summary', async () => {
        const result = await makeService({ salesInvoices }).getSalesSummary('t1', {});

        expect(result.totalSales).toBe(24100);
        expect(result.count).toBe(2);
    });

    it('converts sales, purchases and expenses to base currency in the profit summary', async () => {
        const result = await makeService({ salesInvoices, purchaseInvoices, expenses }).getProfitSummary('t1', {});

        expect(result).toEqual({
            totalSales: 24100,
            totalPurchases: 50,
            totalExpenses: 10000,
            grossProfit: 24050,
            netProfit: 14050,
        });
    });
});
