import { ConflictException } from '@nestjs/common';
import { CashboxesService } from './services/cashboxes.service';

/** Phase 5.3.5 — journal_lines.cashbox_id is ON DELETE SET NULL. */
function build(ledgerReferences: number) {
    const repository = {
        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'c1', tenantId: 't1' }),
        countLedgerReferences: jest.fn().mockResolvedValue(ledgerReferences),
        delete: jest.fn().mockResolvedValue({}),
    };
    const svc = new CashboxesService(repository as any, {} as any, { next: jest.fn() } as any, { emit: jest.fn() } as any);
    return { svc, repository };
}

describe('CashboxesService.delete — ledger references', () => {
    it('refuses with 409 when journal lines reference the cashbox', async () => {
        const { svc, repository } = build(1);

        await expect(svc.delete('t1', 'c1')).rejects.toThrow(ConflictException);
        expect(repository.countLedgerReferences).toHaveBeenCalledWith('t1', 'c1');
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced cashbox', async () => {
        const { svc, repository } = build(0);

        await svc.delete('t1', 'c1');

        expect(repository.delete).toHaveBeenCalledWith('c1');
    });
});
