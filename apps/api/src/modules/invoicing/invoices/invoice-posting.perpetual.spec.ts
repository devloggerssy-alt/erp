import { InvoicePostingService } from './invoice-posting.service';

function deps(settings: any) {
    const tx = {
        stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
        stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'b', quantity: 100, averageCost: 3 }), create: jest.fn(), update: jest.fn() },
        chartOfAccount: { findMany: jest.fn().mockResolvedValue([
            { id: 'ar', code: 'ar', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null },
            { id: 'ap', code: 'ap', type: 'LIABILITY', isPostable: true, isContra: false, deletedAt: null },
            { id: 'sales', code: 'sales', type: 'REVENUE', isPostable: true, isContra: false, deletedAt: null },
            { id: 'purchase', code: 'purchase', type: 'EXPENSE', isPostable: true, isContra: false, deletedAt: null },
            { id: 'inv', code: 'inv', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null },
            { id: 'cogs', code: 'cogs', type: 'EXPENSE', isPostable: true, isContra: false, deletedAt: null },
        ]) },
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv', status: 'POSTED' }) },
        item: { update: jest.fn() },
    };
    const prisma = { invoice: { findFirst: jest.fn() }, item: { findUnique: jest.fn() }, $transaction: jest.fn((cb: any) => cb(tx)) } as any;
    const inventory = { postMovementTx: jest.fn() } as any;
    const fs = { getOrThrow: jest.fn().mockResolvedValue(settings) } as any;
    const seq = { getNextNumber: jest.fn().mockResolvedValue('JE-1') } as any;
    const journalPosting = { post: jest.fn().mockResolvedValue({ id: 'je' }), reverse: jest.fn().mockResolvedValue({ id: 'je-r' }) } as any;
    return { svc: new InvoicePostingService(prisma, inventory, fs, seq, journalPosting), prisma, tx, inventory, journalPosting };
}
const SETTINGS = {
    defaultReceivableAccountId: 'ar', defaultPayableAccountId: 'ap', defaultSalesAccountId: 'sales',
    defaultPurchaseAccountId: 'purchase', defaultTaxAccountId: null,
    defaultInventoryAccountId: 'inv', defaultCogsAccountId: 'cogs',
};
const stockLine = { itemId: 'i1', quantity: 2, unitPrice: 300, total: 600, taxAmount: 0, item: { itemType: 'product' } };

describe('InvoicePostingService — perpetual', () => {
    it('purchase: capitalizes stock lines to Inventory and posts movement in-tx', async () => {
        const { svc, prisma, tx, inventory, journalPosting } = deps(SETTINGS);
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'P1',
            exchangeRate: 1, subtotal: 600, discountAmount: 0, taxAmount: 0, total: 600, partyId: 'p1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [stockLine],
            party: { payableAccountId: null }, fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postPurchaseInvoice('t', 'inv', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'PURCHASE', unitCost: 300 }));
        const jeLines = journalPosting.post.mock.calls[0][1].lines;
        expect(jeLines.some((l: any) => l.accountId === 'inv' && Number(l.debit) === 600)).toBe(true);
    });

    it('purchase: capitalizes stock at NET-of-discount cost so GL debit equals ledger cost', async () => {
        const { svc, prisma, tx, inventory, journalPosting } = deps(SETTINGS);
        const discountedLine = { itemId: 'i1', quantity: 2, unitPrice: 300, total: 500, taxAmount: 0, item: { itemType: 'product' } };
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'P2',
            exchangeRate: 1, subtotal: 500, discountAmount: 0, taxAmount: 0, total: 500, partyId: 'p1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [discountedLine],
            party: { payableAccountId: null }, fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postPurchaseInvoice('t', 'inv', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'PURCHASE', unitCost: 250 }));
        const jeLines = journalPosting.post.mock.calls[0][1].lines;
        expect(jeLines.some((l: any) => l.accountId === 'inv' && Number(l.debit) === 500)).toBe(true);
    });

    it('sale: posts a COGS leg at averageCost with no rate applied', async () => {
        const { svc, prisma, journalPosting } = deps(SETTINGS);
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'S1',
            exchangeRate: 1, subtotal: 1000, discountAmount: 0, taxAmount: 0, total: 1000, partyId: 'p1',
            invoiceType: { direction: 'SALE', affectsStock: true }, lines: [{ ...stockLine, quantity: 2, unitPrice: 500, total: 1000 }],
            party: { receivableAccountId: null }, fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postSalesInvoice('t', 'inv', 'u');
        const lines = journalPosting.post.mock.calls[0][1].lines;
        // avgCost 3 * qty 2 = 6
        expect(lines.some((l: any) => l.accountId === 'cogs' && Number(l.debit) === 6)).toBe(true);
        expect(lines.some((l: any) => l.accountId === 'inv' && Number(l.credit) === 6)).toBe(true);
    });

    it('rejects posting to a CLOSED period', async () => {
        const { svc, prisma } = deps(SETTINGS);
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', number: 'S2',
            invoiceType: { direction: 'SALE', affectsStock: false }, lines: [], party: {},
            fiscalPeriod: { status: 'CLOSED' }, exchangeRate: 1, subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0, partyId: 'p1', date: new Date(),
        });
        await expect(svc.postSalesInvoice('t', 'inv', 'u')).rejects.toThrow(/closed/i);
    });
});
