import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

/**
 * Phase 5.3 — only DRAFT invoices can be deleted (and no HTTP route exposes
 * even that); posted invoices are cancelled via InvoicePostingService.
 */
function build(status: string) {
    const tx = {
        tagAssignment: { deleteMany: jest.fn() },
        customFieldValue: { deleteMany: jest.fn() },
        invoiceLine: { deleteMany: jest.fn() },
        invoice: { delete: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)) };
    const svc = new InvoicesService(prisma as any, {} as any, {} as any, {} as any);
    jest.spyOn(svc, 'findById').mockResolvedValue({ id: 'inv-1', status } as any);
    return { svc, prisma, tx };
}

describe('InvoicesService.delete — deletion guard', () => {
    it.each(['POSTED', 'CANCELLED'])('refuses to delete a %s invoice', async (status) => {
        const { svc, prisma } = build(status);

        await expect(svc.delete('t1', 'inv-1')).rejects.toThrow(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deletes a DRAFT invoice with its lines', async () => {
        const { svc, tx } = build('DRAFT');

        await svc.delete('t1', 'inv-1');

        expect(tx.invoiceLine.deleteMany).toHaveBeenCalledWith({ where: { invoiceId: 'inv-1' } });
        expect(tx.invoice.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    });
});
