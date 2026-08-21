import { BadRequestException, Injectable } from '@nestjs/common';
import type { AccountType } from '@devloggers/db-prisma';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import { openingLineSide } from '../../accounts/utils/opening-line-side';
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
            const rate = entry.exchangeRate ?? intent.exchangeRate ?? 1;
            const { debit, credit } = openingLineSide(account.type, entry.amount, rate);
            lines.push({
                accountId: entry.accountId,
                debit,
                credit,
                description: `Opening balance - ${account.code}`,
                sortOrder: sortOrder++,
                cashboxId: entry.cashboxId ?? null,
                bankAccountId: entry.bankAccountId ?? null,
                currencyId: entry.currencyId ?? null,
                amount: Math.abs(entry.amount),
                exchangeRate: rate,
            });
            totalDebits += debit;
            totalCredits += credit;
        }

        const diff = round(totalDebits - totalCredits);
        if (diff !== 0) {
            lines.push({
                accountId: openingEquityAccountId,
                debit: diff < 0 ? Math.abs(diff) : 0,
                credit: diff > 0 ? diff : 0,
                description: 'Opening balance offset',
                sortOrder: sortOrder++,
                amount: Math.abs(diff),
                exchangeRate: 1,
            });
        }

        return lines;
    }
}