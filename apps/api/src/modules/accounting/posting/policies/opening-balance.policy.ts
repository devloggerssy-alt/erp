import { BadRequestException, Injectable } from '@nestjs/common';
import type { AccountType } from '@devloggers/db-prisma';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';
import type { OpeningBalancePostedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

@Injectable()
export class OpeningBalancePolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(tx: PrismaTransactionClient, intent: OpeningBalancePostedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        const openingEquityAccountId = settings.defaultOpeningEquityAccountId;
        if (!openingEquityAccountId) {
            throw new BadRequestException('No default opening equity account configured in Financial Settings');
        }

        const accountIds = [...new Set(intent.entries.map((e) => e.accountId)), openingEquityAccountId];
        const accounts = await tx.chartOfAccount.findMany({
            where: { id: { in: accountIds }, tenantId: intent.tenantId },
            select: { id: true, code: true, type: true, isPostable: true, isActive: true, deletedAt: true },
        });
        const accountMap = new Map(accounts.map((a) => [a.id, a]));

        for (const entry of intent.entries) {
            const account = accountMap.get(entry.accountId);
            if (!account) throw new BadRequestException(`Account not found: ${entry.accountId}`);
            if (!account.isPostable || account.deletedAt) throw new BadRequestException(`Account "${account.code}" is not postable`);
            if (!account.isActive) throw new BadRequestException(`Account "${account.code}" is not active`);
            const allowedTypes: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY'];
            if (!allowedTypes.includes(account.type)) {
                throw new BadRequestException(`Account "${account.code}" must be ASSET, LIABILITY, or EQUITY (got ${account.type})`);
            }
        }
        if (!accountMap.get(openingEquityAccountId)) {
            throw new BadRequestException('Opening equity account not found');
        }

        const lines: JournalLineDraft[] = [];
        let totalDebits = 0;
        let totalCredits = 0;
        let sortOrder = 0;

        for (const entry of intent.entries) {
            const account = accountMap.get(entry.accountId)!;
            const absAmount = Math.abs(entry.amount);
            const entryExchangeRate = (entry as any).exchangeRate ?? intent.exchangeRate ?? 1;
            const entryCurrencyId = (entry as any).currencyId ?? null;
            const entryCashboxId = (entry as any).cashboxId ?? null;
            const entryBankAccountId = (entry as any).bankAccountId ?? null;
            // base amount (for totals/offset) — entries are assumed txn unless exchangeRate !=1
            const baseAmount = round(absAmount * entryExchangeRate);

            if (account.type === 'ASSET') {
                const isDebit = entry.amount > 0;
                lines.push({
                    accountId: entry.accountId,
                    debit: isDebit ? baseAmount : 0,
                    credit: isDebit ? 0 : baseAmount,
                    description: `Opening balance - ${account.code}`,
                    sortOrder: sortOrder++,
                    cashboxId: entryCashboxId,
                    bankAccountId: entryBankAccountId,
                    currencyId: entryCurrencyId,
                    amount: absAmount,
                    exchangeRate: entryExchangeRate,
                });
                if (entry.amount > 0) totalDebits += baseAmount; else totalCredits += baseAmount;
            } else {
                const isCredit = entry.amount > 0;
                lines.push({
                    accountId: entry.accountId,
                    debit: isCredit ? 0 : baseAmount,
                    credit: isCredit ? baseAmount : 0,
                    description: `Opening balance - ${account.code}`,
                    sortOrder: sortOrder++,
                    cashboxId: entryCashboxId,
                    bankAccountId: entryBankAccountId,
                    currencyId: entryCurrencyId,
                    amount: absAmount,
                    exchangeRate: entryExchangeRate,
                });
                if (entry.amount > 0) totalCredits += baseAmount; else totalDebits += baseAmount;
            }
        }

        const diff = round(totalDebits - totalCredits);
        if (diff !== 0) {
            if (diff > 0) {
                lines.push({
                    accountId: openingEquityAccountId,
                    debit: 0,
                    credit: diff,
                    description: 'Opening balance offset',
                    sortOrder: sortOrder++,
                    amount: diff,
                    exchangeRate: 1,
                });
            } else {
                lines.push({
                    accountId: openingEquityAccountId,
                    debit: Math.abs(diff),
                    credit: 0,
                    description: 'Opening balance offset',
                    sortOrder: sortOrder++,
                    amount: Math.abs(diff),
                    exchangeRate: 1,
                });
            }
        }

        return lines;
    }
}
