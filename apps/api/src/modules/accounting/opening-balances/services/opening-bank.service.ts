import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { AccountingPostingFacade, type OpeningSessionPostedIntent, type PrismaTransactionClient } from '../../posting';
import type { OpeningSessionLineDraft } from '../../posting/contracts/posting-intent';

export interface OpeningBankPostInput {
    bankAccountId: string;
    currencyId: string;
    /** Signed transaction-currency amount; positive increases the bank balance (ADR-2). */
    amount: number;
    exchangeRate?: number;
    fiscalPeriodId: string;
    fiscalPeriodStatus?: string | undefined;
    date?: Date;
    description?: string;
}

/**
 * Opening-bank subledger service (ADR-2). Builds a BANK_ACCOUNT opening line and, on
 * post, keeps the BankAccount.balance projection in the same transaction as the JE.
 * GL account (defaultBankAccountId) is resolved by OpeningSessionPostedPolicy.
 */
@Injectable()
export class OpeningBankService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly postingFacade: AccountingPostingFacade,
    ) {}

    toLineDraft(input: { bankAccountId: string; currencyId: string; amount: number; exchangeRate?: number }): OpeningSessionLineDraft {
        return {
            dimension: 'BANK_ACCOUNT',
            bankAccountId: input.bankAccountId,
            currencyId: input.currencyId,
            amount: input.amount,
            exchangeRate: input.exchangeRate,
        };
    }

    async post(tenantId: string, userId: string, input: OpeningBankPostInput): Promise<{ journalEntryId: string }> {
        const intent: OpeningSessionPostedIntent = {
            kind: 'OPENING_SESSION_POSTED',
            tenantId,
            userId,
            date: input.date ?? new Date(),
            fiscalPeriodId: input.fiscalPeriodId,
            fiscalPeriodStatus: input.fiscalPeriodStatus,
            exchangeRate: input.exchangeRate ?? 1,
            referenceId: `opening-bank-${input.bankAccountId}-${Date.now()}`,
            description: input.description ?? 'Opening bank balance',
            lines: [this.toLineDraft(input)],
        };

        return this.prisma.$transaction(async (tx) => {
            const result = await this.postingFacade.record(tx, intent);
            await this.syncProjection(tx, input.bankAccountId, input.amount);
            return result;
        });
    }

    /** Keeps BankAccount.balance in sync with a posted bank opening — must run in the posting transaction. */
    async syncProjection(tx: PrismaTransactionClient, bankAccountId: string, amount: number): Promise<void> {
        await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { balance: { increment: amount } },
        });
    }
}