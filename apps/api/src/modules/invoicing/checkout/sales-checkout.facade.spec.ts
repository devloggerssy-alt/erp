import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesCheckoutFacade } from './sales-checkout.facade';
import type { SalesCheckoutIntent } from './sales-checkout.types';

function deps() {
    const tx = {
        invoice: {
            create: jest.fn().mockResolvedValue({
                id: 'inv-1', number: 'SAL-00001', tenantId: 't1', date: new Date('2026-09-25'),
                warehouseId: 'wh-1', partyId: 'party-1', fiscalPeriodId: 'fp-1', currencyId: 'cur-1',
                invoiceType: { affectsStock: true }, lines: [], fiscalPeriod: { status: 'OPEN' },
            }),
        },
        payment: { create: jest.fn().mockResolvedValue({ id: 'pay-1', number: 'REC-00001', date: new Date('2026-09-25'), fiscalPeriodId: 'fp-1', partyId: 'party-1', fiscalPeriod: { status: 'OPEN' } }) },
    };
    const prisma = {
        invoice: { findUnique: jest.fn().mockResolvedValue(null) },
        invoiceType: { findFirst: jest.fn().mockResolvedValue({ id: 'itype-1', direction: 'SALE' }) },
        currency: { findFirst: jest.fn().mockResolvedValue({ id: 'cur-1', isBase: true }) },
        fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: 'fp-1', status: 'OPEN' }) },
        $transaction: jest.fn((cb: any) => cb(tx)),
    } as any;
    const docSeq = { getNextNumberInTx: jest.fn().mockResolvedValueOnce('SAL-00001').mockResolvedValueOnce('REC-00001') } as any;
    const invoicePosting = {
        postSalesInvoiceInTx: jest.fn().mockResolvedValue({ id: 'inv-1', number: 'SAL-00001', date: new Date('2026-09-25') }),
    } as any;
    const payments = {
        postInTx: jest.fn().mockResolvedValue(undefined),
        allocateInTx: jest.fn().mockResolvedValue({ id: 'alloc-1' }),
    } as any;

    const facade = new SalesCheckoutFacade(prisma, docSeq, invoicePosting, payments);
    return { facade, prisma, tx, docSeq, invoicePosting, payments };
}

const intent: SalesCheckoutIntent = {
    tenantId: 't1', userId: 'u1', clientRequestId: 'req-1',
    invoiceTypeId: 'itype-1', partyId: 'party-1', warehouseId: 'wh-1', cashboxId: 'cbx-1',
    lines: [{ itemId: 'item-1', unitId: 'unit-1', quantity: 2, unitPrice: 100 }],
};

describe('SalesCheckoutFacade.checkout', () => {
    it('creates, posts, and pays for a sale in one transaction', async () => {
        const { facade, prisma, tx, invoicePosting, payments } = deps();

        const result = await facade.checkout(intent);

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(tx.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ tenantId: 't1', clientRequestId: 'req-1', total: 200 }),
        }));
        expect(invoicePosting.postSalesInvoiceInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ id: 'inv-1' }), 'u1');
        expect(tx.payment.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ type: 'RECEIPT', amount: 200, unallocatedAmount: 200 }),
        }));
        expect(payments.postInTx).toHaveBeenCalledWith(tx, 'pay-1', 'cbx-1', 200, 'u1', expect.objectContaining({ kind: 'PAYMENT_RECORDED' }));
        expect(payments.allocateInTx).toHaveBeenCalledWith(tx, 't1', 'pay-1', 'inv-1', 200);
        expect(result).toEqual({
            invoiceId: 'inv-1', invoiceNumber: 'SAL-00001',
            paymentId: 'pay-1', paymentNumber: 'REC-00001',
            total: 200, date: expect.any(Date), replayed: false,
        });
    });

    it('replays a prior sale when clientRequestId already exists', async () => {
        const { facade, prisma } = deps();
        prisma.invoice.findUnique.mockResolvedValue({
            id: 'inv-old', number: 'SAL-00099', total: 200, date: new Date('2026-09-20'),
            paymentAllocations: [{ payment: { id: 'pay-old', number: 'REC-00099' } }],
        });

        const result = await facade.checkout(intent);

        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(result).toEqual({
            invoiceId: 'inv-old', invoiceNumber: 'SAL-00099',
            paymentId: 'pay-old', paymentNumber: 'REC-00099',
            total: 200, date: expect.any(Date), replayed: true,
        });
    });

    it('rejects tendered below total before any write', async () => {
        const { facade, prisma } = deps();

        await expect(facade.checkout({ ...intent, minimumTender: 100 })).rejects.toThrow(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an unknown invoice type', async () => {
        const { facade, prisma } = deps();
        prisma.invoiceType.findFirst.mockResolvedValue(null);

        await expect(facade.checkout(intent)).rejects.toThrow(NotFoundException);
    });

    it('rejects when no fiscal period is open today', async () => {
        const { facade, prisma } = deps();
        prisma.fiscalPeriod.findFirst.mockResolvedValue(null);

        await expect(facade.checkout(intent)).rejects.toThrow(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
});
