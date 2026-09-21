import { BadRequestException, Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { assertFiscalPeriodOpen } from '../utils/assert-period-open';
import type { PrismaTransactionClient } from '../../posting/contracts/prisma-tx';

export interface PostingJournalLine {
    accountId: string;
    debit: number;
    credit: number;
    description: string | null;
    sortOrder: number;
    partyId?: string | null;
    cashboxId?: string | null;
    bankAccountId?: string | null;
    currencyId?: string | null;
    amount?: number;
    exchangeRate?: number;
}

export interface PostInput {
    tenantId: string;
    number: string;
    date: Date;
    fiscalPeriodId: string;
    fiscalPeriodStatus: string | undefined;
    referenceType: ReferenceType;
    referenceId: string;
    description: string;
    exchangeRate: number;
    userId: string;
    lines: PostingJournalLine[];
    reversalOfId?: string;
    reversalDate?: Date;
}

export interface ReverseInput {
    tenantId: string;
    number: string;
    originalEntryId: string;
    referenceType: ReferenceType;
    referenceId: string;
    description: string;
    exchangeRate: number;
    userId: string;
    reversalDate: Date;
    fiscalPeriodId: string;
    fiscalPeriodStatus: string | undefined;
}

interface AccountMeta {
    id: string;
    code: string;
    type: string;
    isPostable: boolean;
    isContra: boolean;
    deletedAt: Date | null;
}

const BALANCE_TOLERANCE = 0.0001;

@Injectable()
export class JournalPostingService {
    async post(tx: PrismaTransactionClient, input: PostInput): Promise<{ id: string }> {
        assertFiscalPeriodOpen(input.fiscalPeriodStatus);

        if (input.lines.length === 0) {
            throw new BadRequestException('Cannot post a journal entry with no lines');
        }

        const accountIds = Array.from(new Set(input.lines.map((l) => l.accountId)));
        const accounts = await tx.chartOfAccount.findMany({
            where: { id: { in: accountIds } },
            select: { id: true, code: true, type: true, isPostable: true, isContra: true, deletedAt: true },
        });
        const accountMap = new Map<string, AccountMeta>(accounts.map((a) => [a.id, a]));

        for (const id of accountIds) {
            const acc = accountMap.get(id);
            if (!acc) throw new BadRequestException(`Account "${id}" does not exist`);
            if (acc.deletedAt) throw new BadRequestException(`Account "${acc.code}" is deleted`);
            if (!acc.isPostable) throw new BadRequestException(`Account "${acc.code}" is not postable`);
        }

        const totalDebit = input.lines.reduce((s, l) => s + Number(l.debit), 0);
        const totalCredit = input.lines.reduce((s, l) => s + Number(l.credit), 0);
        if (Math.abs(totalDebit - totalCredit) > BALANCE_TOLERANCE) {
            throw new BadRequestException(
                `Journal entry is not balanced: debit ${totalDebit} ≠ credit ${totalCredit}`,
            );
        }

        const entry = await tx.journalEntry.create({
            data: {
                tenantId: input.tenantId,
                number: input.number,
                date: input.date,
                fiscalPeriodId: input.fiscalPeriodId,
                referenceType: input.referenceType,
                referenceId: input.referenceId,
                description: input.description,
                status: 'POSTED',
                exchangeRate: input.exchangeRate,
                postedAt: new Date(),
                createdBy: input.userId,
                reversalOfId: input.reversalOfId,
                reversalDate: input.reversalDate,
                lines: {
                    create: input.lines.map((l) => ({
                        tenantId: input.tenantId,
                        accountId: l.accountId,
                        partyId: l.partyId ?? null,
                        cashboxId: l.cashboxId ?? null,
                        bankAccountId: l.bankAccountId ?? null,
                        currencyId: l.currencyId ?? null,
                        amount: l.amount ?? 0,
                        exchangeRate: l.exchangeRate ?? 1,
                        debit: l.debit,
                        credit: l.credit,
                        description: l.description,
                        sortOrder: l.sortOrder,
                    })),
                },
            },
        });

        return { id: entry.id };
    }

    async reverse(tx: PrismaTransactionClient, input: ReverseInput): Promise<{ id: string }> {
        assertFiscalPeriodOpen(input.fiscalPeriodStatus);

        const original = await tx.journalEntry.findFirst({
            where: { id: input.originalEntryId, tenantId: input.tenantId, status: 'POSTED' },
            include: { lines: { orderBy: { sortOrder: 'asc' } } },
        });
        if (!original) {
            throw new BadRequestException('Original journal entry not found');
        }

        const reversedLines: PostingJournalLine[] = original.lines.map((l) => ({
            accountId: l.accountId,
            debit: Number(l.credit),
            credit: Number(l.debit),
            description: l.description,
            sortOrder: l.sortOrder,
            partyId: (l as any).partyId ?? null,
            cashboxId: (l as any).cashboxId ?? null,
            bankAccountId: (l as any).bankAccountId ?? null,
            currencyId: (l as any).currencyId ?? null,
            amount: (l as any).amount != null ? Number((l as any).amount) : 0,
            exchangeRate: (l as any).exchangeRate != null ? Number((l as any).exchangeRate) : 1,
        }));

        return this.post(tx, {
            tenantId: input.tenantId,
            number: input.number,
            date: input.reversalDate,
            fiscalPeriodId: input.fiscalPeriodId,
            fiscalPeriodStatus: input.fiscalPeriodStatus,
            referenceType: input.referenceType,
            referenceId: input.referenceId,
            description: input.description,
            exchangeRate: input.exchangeRate,
            userId: input.userId,
            lines: reversedLines,
            reversalOfId: original.id,
            reversalDate: input.reversalDate,
        });
    }
}