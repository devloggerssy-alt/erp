import { ConflictException } from '@nestjs/common';
import { CurrenciesService } from './services/currencies.service';

/** Phase 5.3.5 — journal_lines.currency_id is ON DELETE SET NULL. */
function build(ledgerReferences: number) {
    const repository = {
        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'cur1', tenantId: 't1' }),
        countLedgerReferences: jest.fn().mockResolvedValue(ledgerReferences),
        delete: jest.fn().mockResolvedValue({}),
    };
    const svc = new CurrenciesService(repository as any, {} as any, { emit: jest.fn() } as any);
    return { svc, repository };
}

describe('CurrenciesService.delete — ledger references', () => {
    it('refuses with 409 when journal lines reference the currency', async () => {
        const { svc, repository } = build(3);

        await expect(svc.delete('t1', 'cur1')).rejects.toThrow(ConflictException);
        expect(repository.countLedgerReferences).toHaveBeenCalledWith('t1', 'cur1');
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced currency', async () => {
        const { svc, repository } = build(0);

        await svc.delete('t1', 'cur1');

        expect(repository.delete).toHaveBeenCalledWith('cur1');
    });
});
