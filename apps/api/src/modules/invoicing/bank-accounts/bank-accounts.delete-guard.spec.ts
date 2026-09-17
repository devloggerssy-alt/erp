import { ConflictException } from '@nestjs/common';
import { BankAccountsService } from './services/bank-accounts.service';

/** Phase 5.3.5 — journal_lines.bank_account_id is ON DELETE SET NULL. */
function build(ledgerReferences: number) {
    const repository = {
        findByIdOrFail: jest.fn().mockResolvedValue({ id: 'b1', tenantId: 't1' }),
        countLedgerReferences: jest.fn().mockResolvedValue(ledgerReferences),
        delete: jest.fn().mockResolvedValue({}),
    };
    const svc = new BankAccountsService(repository as any, {} as any, { emit: jest.fn() } as any);
    return { svc, repository };
}

describe('BankAccountsService.delete — ledger references', () => {
    it('refuses with 409 when journal lines reference the bank account', async () => {
        const { svc, repository } = build(1);

        await expect(svc.delete('t1', 'b1')).rejects.toThrow(ConflictException);
        expect(repository.countLedgerReferences).toHaveBeenCalledWith('t1', 'b1');
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced bank account', async () => {
        const { svc, repository } = build(0);

        await svc.delete('t1', 'b1');

        expect(repository.delete).toHaveBeenCalledWith('b1');
    });
});
