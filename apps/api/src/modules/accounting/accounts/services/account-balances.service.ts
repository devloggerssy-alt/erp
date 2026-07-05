import { Injectable } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import type { LocalizedString } from '@devloggers/api-contracts';
import type { AccountType } from '@devloggers/db-prisma';
import { AccountsRepository } from '../repositories/accounts.repository';
import { getAccountBalanceDelta } from '../utils/account-balance.utils';
import { rollUpBalances } from '../utils/roll-up-balances';
import { AccountBalanceDto, AccountLedgerLineDto } from '../dto';

@Injectable()
export class AccountBalancesService {
  constructor(
    private readonly repo: AccountsRepository,
    private readonly locale: LocaleResolverService,
  ) {}

  async getBalances(tenantId: string): Promise<AccountBalanceDto[]> {
    const [accounts, sums] = await Promise.all([
      this.repo.findAllForBalances(tenantId),
      this.repo.sumPostedLinesByAccount(tenantId),
    ]);

    const sumByAccount = new Map(sums.map((s) => [s.accountId, s]));

    const own = accounts.map((a) => {
      const s = sumByAccount.get(a.id);
      const ownBalance = s ? getAccountBalanceDelta(a.type, s.debit, s.credit) : 0;
      return { id: a.id, parentId: a.parentId ?? null, ownBalance };
    });
    const ownById = new Map(own.map((o) => [o.id, o.ownBalance]));

    const rolled = rollUpBalances(own);

    return accounts.map((a) => {
      const name = a.name as unknown as LocalizedString;
      const ownBalance = ownById.get(a.id) ?? 0;
      return {
        id: a.id,
        code: a.code,
        name: this.locale.resolve(name),
        nameI18n: name,
        type: a.type as AccountBalanceDto['type'],
        parentId: a.parentId ?? null,
        isActive: a.isActive,
        ownBalance,
        rolledBalance: rolled.get(a.id) ?? ownBalance,
      };
    });
  }

  async getLedger(
    tenantId: string,
    accountId: string,
    page: number,
    limit: number,
  ): Promise<{ data: AccountLedgerLineDto[]; total: number; page: number; limit: number }> {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 50;
    const skip = (safePage - 1) * safeLimit;

    const [total, lines] = await Promise.all([
      this.repo.countLedgerLines(tenantId, accountId),
      this.repo.findLedgerLines(tenantId, accountId, skip, safeLimit),
    ]);

    const data: AccountLedgerLineDto[] = lines.map((l) => ({
      id: l.id,
      date: l.journalEntry.date.toISOString(),
      entryNumber: l.journalEntry.number,
      description: l.description ?? null,
      referenceType: l.journalEntry.referenceType ?? null,
      referenceId: l.journalEntry.referenceId ?? null,
      debit: Number(l.debit),
      credit: Number(l.credit),
    }));

    return { data, total, page: safePage, limit: safeLimit };
  }
}
