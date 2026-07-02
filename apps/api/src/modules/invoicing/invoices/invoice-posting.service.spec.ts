import { InvoicePostingService } from './invoice-posting.service';

function buildDeps() {
    const tx = {
        journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je-rev' }) },
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'CANCELLED' }) },
        chartOfAccount: { findUnique: jest.fn().mockResolvedValue({ type: 'ASSET' }), update: jest.fn() },
        stockMovement: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
        stockBalance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const prisma = {
        invoice: { findFirst: jest.fn() },
        journalEntry: { findFirst: jest.fn().mockResolvedValue({
            id: 'je-orig',
            lines: [
                { accountId: 'ar', debit: 1000, credit: 0, partyId: 'party-1', description: null, sortOrder: 0 },
                { accountId: 'sales', debit: 0, credit: 1000, partyId: null, description: null, sortOrder: 1 },
            ],
        }) },
        $transaction: jest.fn((cb: any) => cb(tx)),
    } as any;
    const inventoryService = { postMovement: jest.fn(), postMovementTx: jest.fn() } as any;
    const financialSettingsService = {
        getOrThrow: jest.fn().mockResolvedValue({
            defaultReceivableAccountId: 'ar-1',
            defaultPayableAccountId: 'ap-1',
            defaultSalesAccountId: 'sales-1',
            defaultPurchaseAccountId: 'purchase-1',
            defaultTaxAccountId: null,
        }),
    } as any;
    const docSeqService = { getNextNumber: jest.fn().mockResolvedValue('JE-00001') } as any;

    const service = new InvoicePostingService(prisma, inventoryService, financialSettingsService, docSeqService);
    return { service, prisma, tx, inventoryService, financialSettingsService, docSeqService };
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
    party: { receivableAccountId: null, payableAccountId: null },
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

    it('reverses the original journal entry line-for-line', async () => {
        const { service, prisma, tx } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({ ...baseInvoice, warehouseId: null, invoiceType: { direction: 'SALE', affectsStock: false }, paymentAllocations: [], fiscalPeriod: { status: 'OPEN' } });
        await service.cancelInvoice('tenant-1', 'inv-1', 'user-1');
        const revLines = tx.journalEntry.create.mock.calls[0][0].data.lines.create;
        expect(revLines).toEqual(expect.arrayContaining([
            expect.objectContaining({ accountId: 'ar', debit: 0, credit: 1000 }),
            expect.objectContaining({ accountId: 'sales', debit: 1000, credit: 0 }),
        ]));
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
