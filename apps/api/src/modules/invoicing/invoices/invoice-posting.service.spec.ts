import { InvoicePostingService } from './invoice-posting.service';
import { AccountingPostingFacade } from '../../accounting/posting';

function buildDeps() {
    const tx = {
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'CANCELLED' }) },
        stockMovement: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
        stockBalance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const postingFacade = {
        record: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }),
        reverse: jest.fn().mockResolvedValue({ journalEntryId: 'je-rev' }),
    } as unknown as AccountingPostingFacade;
    const prisma = {
        invoice: { findFirst: jest.fn() },
        journalEntry: { findFirst: jest.fn().mockResolvedValue({ id: 'je-orig' }) },
        $transaction: jest.fn((cb: any) => cb(tx)),
    } as any;
    const inventoryService = { postMovement: jest.fn(), postMovementTx: jest.fn() } as any;

    const service = new InvoicePostingService(prisma, inventoryService, postingFacade);
    return { service, prisma, tx, inventoryService, postingFacade };
}

const baseInvoice = {
    id: 'inv-1',
    status: 'POSTED',
    warehouseId: null,
    date: new Date('2026-04-14'),
    fiscalPeriodId: 'fp-1',
    number: 'SINV-00001',
    exchangeRate: 1,
    subtotal: 1000,
    discountAmount: 0,
    taxAmount: 0,
    total: 1000,
    partyId: 'party-1',
    invoiceType: { direction: 'SALE', affectsStock: false },
    lines: [],
    fiscalPeriod: { status: 'OPEN' },
};

describe('InvoicePostingService.cancelInvoice', () => {
    it('rejects cancelling an invoice with payments allocated to it', async () => {
        const { service, prisma } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, paymentAllocations: [{ id: 'alloc-1' }] });

        await expect(service.cancelInvoice('tenant-1', 'inv-1', 'user-1')).rejects.toThrow(/payments allocated/);
    });

    it('allows cancelling once no allocations remain', async () => {
        const { service, prisma, tx } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, paymentAllocations: [] });

        const result = await service.cancelInvoice('tenant-1', 'inv-1', 'user-1');

        expect(tx.invoice.update).toHaveBeenCalled();
        expect(result.status).toBe('CANCELLED');
    });

    it('reverses via postingFacade.reverse with the original entry id and reversal metadata', async () => {
        const { service, prisma, postingFacade } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, warehouseId: null, invoiceType: { direction: 'SALE', affectsStock: false }, paymentAllocations: [], fiscalPeriod: { status: 'OPEN' } });
        await service.cancelInvoice('tenant-1', 'inv-1', 'user-1');
        expect(postingFacade.reverse).toHaveBeenCalledTimes(1);
        const [, intent] = (postingFacade.reverse as jest.Mock).mock.calls[0];
        expect(intent.originalEntryId).toBe('je-orig');
        expect(intent.date).toEqual(baseInvoice.date);
        expect(intent.kind).toBe('INVOICE_CANCELLED');
        expect(intent.referenceId).toBe('inv-1');
    });

    it('reverses stock at the ORIGINAL recorded cost, not the invoice unitPrice', async () => {
        const { service, prisma, tx, inventoryService } = buildDeps();
        tx.stockMovement.findMany.mockResolvedValue([
            { warehouseId: 'w1', itemId: 'i1', quantity: -5, unitCost: 3 },
        ]);
        prisma.invoice.findFirst.mockResolvedValue({
            ...baseInvoice,
            warehouseId: 'w1',
            invoiceType: { direction: 'SALE', affectsStock: true },
            lines: [{ itemId: 'i1', quantity: 5, unitPrice: 100, item: { itemType: 'product' } }],
            paymentAllocations: [],
            fiscalPeriod: { status: 'OPEN' },
        });

        await service.cancelInvoice('tenant-1', 'inv-1', 'user-1');

        expect(inventoryService.postMovementTx).toHaveBeenCalledWith(
            tx,
            expect.objectContaining({ quantity: 5, unitCost: 3 }),
        );
    });
});
