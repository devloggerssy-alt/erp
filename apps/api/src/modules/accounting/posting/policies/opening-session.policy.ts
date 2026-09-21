import { BadRequestException, Injectable } from '@nestjs/common';
import type { AccountType } from '@devloggers/db-prisma';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import { openingLineSide } from '../../accounts/utils/opening-line-side';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';
import type { OpeningSessionPostedIntent, OpeningSessionLineDraft } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

interface ResolvedLine {
    accountId: string;
    partyId: string | null;
    cashboxId: string | null;
    bankAccountId: string | null;
    currencyId: string | null;
    amount: number;
    rate: number;
}

/**
 * Resolves the GL account for every opening-session line from FinancialSettings +
 * party overrides (ADR-1/2/3), computes the base-currency debit/credit, carries the
 * operational dimensions onto the journal lines, and offsets any imbalance to the
 * Opening Balance Equity control (domain.md §2). This is the single place in the
 * codebase that decides which GL account an opening hits.
 */
@Injectable()
export class OpeningSessionPostedPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(tx: PrismaTransactionClient, intent: OpeningSessionPostedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        const openingEquityAccountId = settings.defaultOpeningEquityAccountId;
        if (!openingEquityAccountId) {
            throw new BadRequestException('No default opening equity account configured in Financial Settings');
        }

        if (intent.lines.length === 0) {
            throw new BadRequestException('An opening session must have at least one line');
        }

        const resolved: ResolvedLine[] = [];
        for (const line of intent.lines) {
            resolved.push(await this.resolveLine(tx, intent.tenantId, settings, line, intent.exchangeRate));
        }

        const accountIds = [...new Set(resolved.map((r) => r.accountId)), openingEquityAccountId];
        const accounts = await tx.chartOfAccount.findMany({
            where: { id: { in: accountIds }, tenantId: intent.tenantId },
            select: { id: true, code: true, type: true, isPostable: true, isActive: true, deletedAt: true },
        });
        const accountMap = new Map(accounts.map((a) => [a.id, a]));

        for (const accountId of accountIds) {
            const account = accountMap.get(accountId);
            if (!account) throw new BadRequestException(`Account not found: ${accountId}`);
            if (!account.isPostable || account.deletedAt) throw new BadRequestException(`Account "${account.code}" is not postable`);
            if (!account.isActive) throw new BadRequestException(`Account "${account.code}" is not active`);
            const allowedTypes: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY'];
            if (!allowedTypes.includes(account.type)) {
                throw new BadRequestException(`Account "${account.code}" must be ASSET, LIABILITY, or EQUITY (got ${account.type})`);
            }
        }

        const lines: JournalLineDraft[] = [];
        let totalDebits = 0;
        let totalCredits = 0;
        let sortOrder = 0;

        for (const r of resolved) {
            const account = accountMap.get(r.accountId)!;
            const { debit, credit } = openingLineSide(account.type, r.amount, r.rate);
            lines.push({
                accountId: r.accountId,
                debit,
                credit,
                description: `Opening balance - ${account.code}`,
                sortOrder: sortOrder++,
                partyId: r.partyId,
                cashboxId: r.cashboxId,
                bankAccountId: r.bankAccountId,
                currencyId: r.currencyId,
                amount: Math.abs(r.amount),
                exchangeRate: r.rate,
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

    private async resolveLine(
        tx: PrismaTransactionClient,
        tenantId: string,
        settings: {
            defaultCashAccountId: string | null;
            defaultBankAccountId: string | null;
            defaultReceivableAccountId: string | null;
            defaultPayableAccountId: string | null;
        },
        line: OpeningSessionLineDraft,
        intentRate: number,
    ): Promise<ResolvedLine> {
        let accountId: string;
        let partyId: string | null = null;
        let cashboxId: string | null = null;
        let bankAccountId: string | null = null;

        switch (line.dimension) {
            case 'ACCOUNT':
                if (!line.accountId) throw new BadRequestException('ACCOUNT line requires accountId');
                accountId = line.accountId;
                break;
            case 'CASHBOX':
                if (!line.cashboxId) throw new BadRequestException('CASHBOX line requires cashboxId');
                if (!settings.defaultCashAccountId) {
                    throw new BadRequestException('No default Cash account configured in Financial Settings');
                }
                accountId = settings.defaultCashAccountId;
                cashboxId = line.cashboxId;
                break;
            case 'BANK_ACCOUNT':
                if (!line.bankAccountId) throw new BadRequestException('BANK_ACCOUNT line requires bankAccountId');
                if (!settings.defaultBankAccountId) {
                    throw new BadRequestException('No default Bank account configured in Financial Settings');
                }
                accountId = settings.defaultBankAccountId;
                bankAccountId = line.bankAccountId;
                break;
            case 'PARTY': {
                if (!line.partyId) throw new BadRequestException('PARTY line requires partyId');
                if (!line.partySide) throw new BadRequestException('PARTY line requires partySide (AR or AP)');
                const party = await tx.party.findFirst({
                    where: { id: line.partyId, tenantId },
                    select: { receivableAccountId: true, payableAccountId: true },
                });
                if (!party) throw new BadRequestException(`Party not found: ${line.partyId}`);
                if (line.partySide === 'AR') {
                    accountId = party.receivableAccountId ?? settings.defaultReceivableAccountId ?? '';
                    if (!accountId) {
                        throw new BadRequestException('No Accounts Receivable account configured. Set a default in Financial Settings or on the party.');
                    }
                } else {
                    accountId = party.payableAccountId ?? settings.defaultPayableAccountId ?? '';
                    if (!accountId) {
                        throw new BadRequestException('No Accounts Payable account configured. Set a default in Financial Settings or on the party.');
                    }
                }
                partyId = line.partyId;
                break;
            }
            default:
                throw new BadRequestException(`Unsupported opening dimension: ${String((line as { dimension?: unknown }).dimension)}`);
        }

        return {
            accountId,
            partyId,
            cashboxId,
            bankAccountId,
            currencyId: line.currencyId ?? null,
            amount: line.amount,
            rate: line.exchangeRate ?? intentRate ?? 1,
        };
    }
}