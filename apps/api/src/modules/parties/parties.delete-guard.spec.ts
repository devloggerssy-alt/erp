import { ConflictException } from '@nestjs/common';
import { PartiesService } from './parties.service';

/** Phase 5.3.5 — payments.party_id and journal_lines.party_id are ON DELETE SET NULL. */
function build(ledgerReferences: number) {
    const repository = {
        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'p1', tenantId: 't1' }),
        countLedgerReferences: jest.fn().mockResolvedValue(ledgerReferences),
        delete: jest.fn().mockResolvedValue({}),
    };
    const prisma = { tagAssignment: { deleteMany: jest.fn() }, customFieldValue: { deleteMany: jest.fn() } };
    const svc = new PartiesService(repository as any, {} as any, prisma as any, { emit: jest.fn() } as any);
    return { svc, repository };
}

describe('PartiesService.delete — ledger references', () => {
    it('refuses with 409 when payments or journal lines reference the party', async () => {
        const { svc, repository } = build(2);

        await expect(svc.delete('t1', 'p1')).rejects.toThrow(ConflictException);
        expect(repository.countLedgerReferences).toHaveBeenCalledWith('t1', 'p1');
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced party', async () => {
        const { svc, repository } = build(0);

        await svc.delete('t1', 'p1');

        expect(repository.delete).toHaveBeenCalledWith('p1');
    });
});
