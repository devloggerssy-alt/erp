import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { AccountingPostingFacade, type OpeningSessionPostedIntent, type PrismaTransactionClient } from '../../posting';
import type { OpeningSessionLineDraft } from '../../posting/contracts/posting-intent';

export interface OpeningCashPostInput {
    cashboxId: string;
    currencyId: string;
    /** Signed transaction-currency amount; positive increases the cashbox balance (ADR-4). */
    amount: number;
    exchangeRate?: number;
    fiscalPeriodId: string;
    fiscalPeriodStatus?: string | undefined;
    date?: Date;
    description?: string;
}

/**
 * Opening-cash subledger service (ADR-4). Builds a CASHBOX opening line and, on post,
 * keeps the Cashbox.balance projection in the same transaction as the JE. The GL
 * account (defaultCashAccountId) is resolved by OpeningSessionPostedPolicy — this
 * service never names a GL account.
 */
@Injectable()
export class OpeningCashService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly postingFacade: AccountingPostingFacade,
    ) {}

    toLineDraft(input: { cashboxId: string; currencyId: string; amount: number; exchangeRate?: number }): OpeningSessionLineDraft {
        return {
            dimension: 'CASHBOX',
            cashboxId: input.cashboxId,
            currencyId: input.currencyId,
            amount: input.amount,
            exchangeRate: input.exchangeRate,
        };
    }

    async post(tenantId: string, userId: string, input: OpeningCashPostInput): Promise<{ journalEntryId: string }> {
        const intent: OpeningSessionPostedIntent = {
            kind: 'OPENING_SESSION_POSTED',
            tenantId,
            userId,
            date: input.date ?? new Date(),
            fiscalPeriodId: input.fiscalPeriodId,
            fiscalPeriodStatus: input.fiscalPeriodStatus,
            exchangeRate: input.exchangeRate ?? 1,
            referenceId: `opening-cash-${input.cashboxId}-${Date.now()}`,
            description: input.description ?? 'Opening cash balance',
            lines: [this.toLineDraft(input)],
        };

        return this.prisma.$transaction(async (tx) => {
            const result = await this.postingFacade.record(tx, intent);
            await this.syncProjection(tx, input.cashboxId, input.amount);
            return result;
        });
    }

    /** Keeps Cashbox.balance in sync with a posted cash opening — must run in the posting transaction. */
    async syncProjection(tx: PrismaTransactionClient, cashboxId: string, amount: number): Promise<void> {
        await tx.cashbox.update({
            where: { id: cashboxId },
            data: { balance: { increment: amount } },
        });
    }
}