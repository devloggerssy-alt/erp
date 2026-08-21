import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { AccountingPostingFacade, type OpeningSessionPostedIntent } from '../../posting';
import type { OpeningSessionLineDraft } from '../../posting/contracts/posting-intent';

export interface PartyOpeningPostInput {
    partyId: string;
    partySide: 'AR' | 'AP';
    currencyId: string;
    /** Positive amount increases the control balance: AR → debit, AP → credit. */
    amount: number;
    exchangeRate?: number;
    fiscalPeriodId: string;
    fiscalPeriodStatus?: string | undefined;
    date?: Date;
    description?: string;
}

/**
 * Party opening-balance subledger service (ADR-3). AR/AP control account + partyId +
 * currency on the journal line; party statements are derived from journal lines, so
 * there is NO operational projection to sync here. GL account resolved by
 * OpeningSessionPostedPolicy from the party override or FinancialSettings default.
 */
@Injectable()
export class PartyOpeningBalanceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly postingFacade: AccountingPostingFacade,
    ) {}

    toLineDraft(input: { partyId: string; partySide: 'AR' | 'AP'; currencyId: string; amount: number; exchangeRate?: number }): OpeningSessionLineDraft {
        return {
            dimension: 'PARTY',
            partyId: input.partyId,
            partySide: input.partySide,
            currencyId: input.currencyId,
            amount: input.amount,
            exchangeRate: input.exchangeRate,
        };
    }

    async post(tenantId: string, userId: string, input: PartyOpeningPostInput): Promise<{ journalEntryId: string }> {
        const intent: OpeningSessionPostedIntent = {
            kind: 'OPENING_SESSION_POSTED',
            tenantId,
            userId,
            date: input.date ?? new Date(),
            fiscalPeriodId: input.fiscalPeriodId,
            fiscalPeriodStatus: input.fiscalPeriodStatus,
            exchangeRate: input.exchangeRate ?? 1,
            referenceId: `opening-party-${input.partyId}-${Date.now()}`,
            description: input.description ?? 'Party opening balance',
            lines: [this.toLineDraft(input)],
        };

        return this.prisma.$transaction((tx) => this.postingFacade.record(tx, intent));
    }
}