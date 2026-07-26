import { InvoicePostingService } from './invoice-posting.service';
import { AccountingPostingFacade } from '../../accounting/posting';

function deps() {
    const tx = {
        stockMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
        stockBalance: { findUnique: jest.fn().mockResolvedValue({ id: 'b', quantity: 100, averageCost: 3 }), create: jest.fn(), update: jest.fn() },
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv', status: 'POSTED' }) },
        item: { update: jest.fn() },
    };
    const prisma = { invoice: { findFirst: jest.fn() }, $transaction: jest.fn((cb: any) => cb(tx)) } as any;
    const inventory = { postMovementTx: jest.fn() } as any;
    const postingFacade = {
        record: jest.fn().mockResolvedValue({ journalEntryId: 'je' }),
        reverse: jest.fn().mockResolvedValue({ journalEntryId: 'je-r' }),
    } as unknown as AccountingPostingFacade;
    return { svc: new InvoicePostingService(prisma, inventory, postingFacade), prisma, tx, inventory, postingFacade };
}
const stockLine = { itemId: 'i1', quantity: 2, unitPrice: 300, total: 600, taxAmount: 0, item: { itemType: 'product' } };

describe('InvoicePostingService — perpetual', () => {
    it('purchase: capitalizes stock lines to Inventory and posts movement in-tx', async () => {
        const { svc, prisma, tx, inventory, postingFacade } = deps();
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'P1',
            exchangeRate: 1, subtotal: 600, discountAmount: 0, taxAmount: 0, total: 600, partyId: 'p1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [stockLine],
            fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postPurchaseInvoice('t', 'inv', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'PURCHASE', unitCost: 300 }));
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        expect(intent.inventoryAmount).toBe(600);
    });

    it('purchase: capitalizes stock at NET-of-discount cost so GL debit equals ledger cost', async () => {
        const { svc, prisma, tx, inventory, postingFacade } = deps();
        const discountedLine = { itemId: 'i1', quantity: 2, unitPrice: 300, total: 500, taxAmount: 0, item: { itemType: 'product' } };
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'P2',
            exchangeRate: 1, subtotal: 500, discountAmount: 0, taxAmount: 0, total: 500, partyId: 'p1',
            invoiceType: { direction: 'PURCHASE', affectsStock: true }, lines: [discountedLine],
            fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postPurchaseInvoice('t', 'inv', 'u');
        expect(inventory.postMovementTx).toHaveBeenCalledWith(tx, expect.objectContaining({ movementType: 'PURCHASE', unitCost: 250 }));
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        expect(intent.inventoryAmount).toBe(500);
    });

    it('sale: computes a cogsTotal at averageCost with no rate applied', async () => {
        const { svc, prisma, postingFacade } = deps();
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', date: new Date(), number: 'S1',
            exchangeRate: 1, subtotal: 1000, discountAmount: 0, taxAmount: 0, total: 1000, partyId: 'p1',
            invoiceType: { direction: 'SALE', affectsStock: true }, lines: [{ ...stockLine, quantity: 2, unitPrice: 500, total: 1000 }],
            fiscalPeriod: { status: 'OPEN' },
        });
        await svc.postSalesInvoice('t', 'inv', 'u');
        const [, intent] = (postingFacade.record as jest.Mock).mock.calls[0];
        // avgCost 3 * qty 2 = 6
        expect(intent.cogsTotal).toBe(6);
    });

    it('rejects posting to a CLOSED period', async () => {
        const { svc, prisma } = deps();
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv', status: 'DRAFT', warehouseId: 'w1', fiscalPeriodId: 'fp', number: 'S2',
            invoiceType: { direction: 'SALE', affectsStock: false }, lines: [],
            fiscalPeriod: { status: 'CLOSED' }, exchangeRate: 1, subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0, partyId: 'p1', date: new Date(),
        });
        await expect(svc.postSalesInvoice('t', 'inv', 'u')).rejects.toThrow(/closed/i);
    });
});
