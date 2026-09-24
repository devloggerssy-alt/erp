import { ReportsService } from './reports.service';

interface PrismaStub {
    expenseItemGroups?: Array<{ accountId: string; _sum: { amount: number | null } }>;
    accounts?: Array<{ id: string; name: unknown }>;
    invoiceLineGroups?: Array<{ itemId: string; _sum: { total: number | null; quantity: number | null } }>;
    items?: Array<{ id: string; name: string; code: string }>;
}

function makeService(stub: PrismaStub = {}): ReportsService {
    const prisma = {
        expenseItem: {
            groupBy: async () => stub.expenseItemGroups ?? [],
        },
        chartOfAccount: {
            findMany: async () => stub.accounts ?? [],
        },
        invoiceLine: {
            groupBy: async () => stub.invoiceLineGroups ?? [],
        },
        item: {
            findMany: async () => stub.items ?? [],
        },
    };
    return new ReportsService(prisma as never);
}

describe('ReportsService.getDashboardExpenseBreakdown', () => {
    it("resolves account names and keeps Prisma's descending order", async () => {
        const result = await makeService({
            expenseItemGroups: [
                { accountId: 'acc-1', _sum: { amount: 700 } },
                { accountId: 'acc-2', _sum: { amount: 300 } },
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

    it('folds accounts beyond the top 5 into a single "other" bucket', async () => {
        const groups = Array.from({ length: 7 }, (_, i) => ({
            accountId: `acc-${i}`,
            _sum: { amount: (7 - i) * 100 },
        }));
        const accounts = groups.map((g) => ({
            id: g.accountId,
            name: { en: `Account ${g.accountId}`, ar: g.accountId },
        }));

        const result = await makeService({ expenseItemGroups: groups, accounts }).getDashboardExpenseBreakdown(
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
            invoiceLineGroups: [
                { itemId: 'item-1', _sum: { total: 500, quantity: 10 } },
                { itemId: 'item-2', _sum: { total: 200, quantity: 4 } },
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

    it('returns an empty array when there are no posted sales in range', async () => {
        const result = await makeService({}).getDashboardTopItems('t1', {});
        expect(result).toEqual([]);
    });
});
