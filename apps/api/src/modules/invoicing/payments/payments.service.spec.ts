import { PaymentsService } from './payments.service';

function buildDeps() {
    const tx = {
        paymentAllocation: { create: jest.fn().mockResolvedValue({ id: 'alloc-1' }) },
        payment: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
        payment: { findFirst: jest.fn(), create: jest.fn() },
        invoice: { findFirst: jest.fn() },
        paymentAllocation: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
        $transaction: jest.fn((cb: any) => cb(tx)),
    } as any;
    const docSeqService = { getNextNumber: jest.fn().mockResolvedValue('REC-00001') } as any;
    const financialSettingsService = { getOrThrow: jest.fn() } as any;
    const journalPosting = { post: jest.fn().mockResolvedValue({ id: 'je-1' }), reverse: jest.fn().mockResolvedValue({ id: 'je-r' }) } as any;

    const service = new PaymentsService(prisma, docSeqService, financialSettingsService, journalPosting);
    return { service, prisma, tx, docSeqService, financialSettingsService, journalPosting };
}

describe('PaymentsService.allocate', () => {
    it('rejects an allocation exceeding the invoice remaining balance', async () => {
        const { service, prisma } = buildDeps();
        prisma.payment.findFirst.mockResolvedValue({
            id: 'pay-1', status: 'POSTED', unallocatedAmount: 1000, partyId: 'party-1', currencyId: 'cur-1',
        });
        prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', partyId: 'party-1', currencyId: 'cur-1', total: 500 });
        prisma.paymentAllocation.aggregate.mockResolvedValue({ _sum: { amount: 400 } });

        await expect(
            service.allocate('tenant-1', 'pay-1', { invoiceId: 'inv-1', amount: 200 }),
        ).rejects.toThrow(/remaining balance/);
    });

    it('rejects allocation to an invoice belonging to a different party', async () => {
        const { service, prisma } = buildDeps();
        prisma.payment.findFirst.mockResolvedValue({
            id: 'pay-1', status: 'POSTED', unallocatedAmount: 1000, partyId: 'party-1', currencyId: 'cur-1',
        });
        prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', partyId: 'party-2', currencyId: 'cur-1', total: 500 });

        await expect(
            service.allocate('tenant-1', 'pay-1', { invoiceId: 'inv-1', amount: 100 }),
        ).rejects.toThrow(/different parties/);
    });

    it('rejects allocation when currencies do not match', async () => {
        const { service, prisma } = buildDeps();
        prisma.payment.findFirst.mockResolvedValue({
            id: 'pay-1', status: 'POSTED', unallocatedAmount: 1000, partyId: 'party-1', currencyId: 'cur-1',
        });
        prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', partyId: 'party-1', currencyId: 'cur-2', total: 500 });

        await expect(
            service.allocate('tenant-1', 'pay-1', { invoiceId: 'inv-1', amount: 100 }),
        ).rejects.toThrow(/currencies do not match/);
    });

    it('allocates when balance, party, and currency all check out', async () => {
        const { service, prisma, tx } = buildDeps();
        prisma.payment.findFirst.mockResolvedValue({
            id: 'pay-1', status: 'POSTED', unallocatedAmount: 1000, partyId: 'party-1', currencyId: 'cur-1',
        });
        prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', partyId: 'party-1', currencyId: 'cur-1', total: 500 });
        prisma.paymentAllocation.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

        await service.allocate('tenant-1', 'pay-1', { invoiceId: 'inv-1', amount: 300 });

        expect(tx.paymentAllocation.create).toHaveBeenCalledWith({
            data: { tenantId: 'tenant-1', paymentId: 'pay-1', invoiceId: 'inv-1', amount: 300 },
        });
    });
});

describe('PaymentsService.create', () => {
    it('posts the payment immediately when complete=true', async () => {
        const { service, prisma } = buildDeps();
        prisma.payment.create.mockResolvedValue({ id: 'pay-1', status: 'DRAFT' });
        const postSpy = jest.spyOn(service, 'post').mockResolvedValue({ id: 'pay-1', status: 'POSTED' } as any);

        const result = await service.create('tenant-1', 'user-1', {
            type: 'RECEIPT',
            date: '2026-04-14',
            cashboxId: 'cash-1',
            currencyId: 'cur-1',
            fiscalPeriodId: 'fp-1',
            amount: 500,
            complete: true,
        } as any);

        expect(postSpy).toHaveBeenCalledWith('tenant-1', 'pay-1', 'user-1');
        expect(result).toEqual({ id: 'pay-1', status: 'POSTED' });
    });

    it('leaves the payment as DRAFT when complete is not set', async () => {
        const { service, prisma } = buildDeps();
        prisma.payment.create.mockResolvedValue({ id: 'pay-1', status: 'DRAFT' });
        const postSpy = jest.spyOn(service, 'post');

        const result = await service.create('tenant-1', 'user-1', {
            type: 'RECEIPT',
            date: '2026-04-14',
            cashboxId: 'cash-1',
            currencyId: 'cur-1',
            fiscalPeriodId: 'fp-1',
            amount: 500,
        } as any);

        expect(postSpy).not.toHaveBeenCalled();
        expect(result).toEqual({ id: 'pay-1', status: 'DRAFT' });
    });
});
