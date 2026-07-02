import { InvoicePostingService } from './invoice-posting.service';

function buildDeps() {
    const tx = {
        journalEntry: { create: jest.fn().mockResolvedValue({}) },
        invoice: { update: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'CANCELLED' }) },
        chartOfAccount: { findUnique: jest.fn(), update: jest.fn() },
    };
    const prisma = {
        invoice: { findFirst: jest.fn() },
        $transaction: jest.fn((cb: any) => cb(tx)),
    } as any;
    const inventoryService = { postMovement: jest.fn() } as any;
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
});
