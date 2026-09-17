import { BadRequestException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';

/** Phase 5.3 — only DRAFT expenses can be deleted; posted ones are cancelled. */
function build(status: string) {
    const prisma = { expense: { delete: jest.fn().mockResolvedValue({}) } };
    const svc = new ExpensesService(prisma as any, {} as any, {} as any);
    jest.spyOn(svc, 'findById').mockResolvedValue({ id: 'e1', status } as any);
    return { svc, prisma };
}

describe('ExpensesService.remove — deletion guard', () => {
    it.each(['POSTED', 'CANCELLED'])('refuses to delete a %s expense', async (status) => {
        const { svc, prisma } = build(status);

        await expect(svc.remove('t1', 'e1')).rejects.toThrow(BadRequestException);
        expect(prisma.expense.delete).not.toHaveBeenCalled();
    });

    it('deletes a DRAFT expense', async () => {
        const { svc, prisma } = build('DRAFT');

        await svc.remove('t1', 'e1');

        expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });
});
