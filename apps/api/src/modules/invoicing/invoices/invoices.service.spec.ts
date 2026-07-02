import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { CreateInvoiceDto } from './dto';

function buildDeps() {
    const prisma = {
        invoiceType: { findFirst: jest.fn() },
        invoice: { create: jest.fn(), findFirst: jest.fn() },
    } as any;
    const documentSequencesService = { getNextNumber: jest.fn().mockResolvedValue('SINV-00001') } as any;
    const postingService = { postPurchaseInvoice: jest.fn(), postSalesInvoice: jest.fn() } as any;
    const paymentsService = { create: jest.fn(), post: jest.fn(), allocate: jest.fn() } as any;

    const service = new InvoicesService(prisma, documentSequencesService, postingService, paymentsService);
    return { service, prisma, documentSequencesService, postingService, paymentsService };
}

const baseDto: CreateInvoiceDto = {
    invoiceTypeId: 'type-1',
    date: '2026-04-14',
    partyId: 'party-1',
    fiscalPeriodId: 'fp-1',
    currencyId: 'cur-1',
    lines: [{ itemId: 'item-1', unitId: 'unit-1', quantity: 1, unitPrice: 1000 }],
};

describe('InvoicesService.create', () => {
    it('posts and allocates the opening payment once the invoice ends up POSTED', async () => {
        const { service, prisma, postingService, paymentsService } = buildDeps();
        prisma.invoiceType.findFirst.mockResolvedValue({ id: 'type-1', direction: 'SALE' });
        prisma.invoice.create.mockResolvedValue({ id: 'inv-1', status: 'DRAFT' });
        prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', status: 'POSTED', paymentAllocations: [] });
        postingService.postSalesInvoice.mockResolvedValue({ id: 'inv-1', status: 'POSTED' });
        paymentsService.create.mockResolvedValue({ id: 'pay-1' });
        paymentsService.post.mockResolvedValue({ id: 'pay-1', status: 'POSTED' });
        paymentsService.allocate.mockResolvedValue({ id: 'alloc-1' });

        await service.create('tenant-1', 'user-1', {
            ...baseDto,
            complete: true,
            openingPayment: { cashboxId: 'cash-1', amount: 500 },
        });

        expect(paymentsService.create).toHaveBeenCalledTimes(1);
        expect(paymentsService.post).toHaveBeenCalledWith('tenant-1', 'pay-1', 'user-1');
        expect(paymentsService.allocate).toHaveBeenCalledWith('tenant-1', 'pay-1', { invoiceId: 'inv-1', amount: 500 });
    });

    it('leaves the opening payment as DRAFT (no post, no allocate) when the invoice stays DRAFT', async () => {
        const { service, prisma, paymentsService } = buildDeps();
        prisma.invoiceType.findFirst.mockResolvedValue({ id: 'type-1', direction: 'SALE' });
        prisma.invoice.create.mockResolvedValue({ id: 'inv-1', status: 'DRAFT' });
        prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', status: 'DRAFT', paymentAllocations: [] });
        paymentsService.create.mockResolvedValue({ id: 'pay-1' });

        await service.create('tenant-1', 'user-1', {
            ...baseDto,
            openingPayment: { cashboxId: 'cash-1', amount: 500 },
        });

        expect(paymentsService.create).toHaveBeenCalledTimes(1);
        expect(paymentsService.post).not.toHaveBeenCalled();
        expect(paymentsService.allocate).not.toHaveBeenCalled();
    });

    it('leaves the invoice saved as DRAFT and surfaces the error when posting fails', async () => {
        const { service, prisma, postingService } = buildDeps();
        prisma.invoiceType.findFirst.mockResolvedValue({ id: 'type-1', direction: 'PURCHASE' });
        prisma.invoice.create.mockResolvedValue({ id: 'inv-1', status: 'DRAFT' });
        postingService.postPurchaseInvoice.mockRejectedValue(new BadRequestException('No warehouse'));

        await expect(
            service.create('tenant-1', 'user-1', { ...baseDto, complete: true }),
        ).rejects.toThrow('No warehouse');

        expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
    });
});

describe('InvoicesService.addPayment', () => {
    it('rejects adding a payment to a non-POSTED invoice', async () => {
        const { service, prisma } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv-1', status: 'DRAFT', total: 1000, paymentAllocations: [],
        });

        await expect(
            service.addPayment('tenant-1', 'user-1', 'inv-1', { cashboxId: 'cash-1', amount: 100, date: '2026-04-20' }),
        ).rejects.toThrow('Payments can only be added to posted invoices');
    });

    it('rejects an amount exceeding the invoice remaining balance', async () => {
        const { service, prisma } = buildDeps();
        prisma.invoice.findFirst.mockResolvedValue({
            id: 'inv-1', status: 'POSTED', total: 1000, paymentAllocations: [{ amount: 800 }],
        });

        await expect(
            service.addPayment('tenant-1', 'user-1', 'inv-1', { cashboxId: 'cash-1', amount: 300, date: '2026-04-20' }),
        ).rejects.toThrow(/remaining balance/);
    });
});
