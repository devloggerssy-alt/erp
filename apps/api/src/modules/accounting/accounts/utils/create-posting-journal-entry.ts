import { updateAccountBalances } from './account-balance.utils';

export interface PostingJournalLine {
    accountId: string;
    debit: number;
    credit: number;
    description: string | null;
    sortOrder: number;
    partyId?: string | null;
}

export interface CreatePostingJournalEntryInput {
    tenantId: string;
    number: string;
    date: Date;
    fiscalPeriodId: string;
    referenceType: string;
    referenceId: string;
    description: string;
    exchangeRate: number;
    userId: string;
    lines: PostingJournalLine[];
}

type PostingTx = {
    journalEntry: { create: (args: unknown) => Promise<{ id: string }> };
    chartOfAccount: { findUnique: Function; update: Function };
};

/**
 * Creates a POSTED journal entry (with lines) and applies the resulting balance
 * deltas to each affected account — the shared tail end of every posting/
 * cancellation flow (invoices, payments, expenses). Must run inside the
 * caller's own `$transaction` so the entity-status update alongside it stays atomic.
 */
export async function createPostingJournalEntry(
    tx: PostingTx,
    input: CreatePostingJournalEntryInput,
): Promise<{ id: string }> {
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
            lines: {
                create: input.lines.map((l) => ({
                    tenantId: input.tenantId,
                    accountId: l.accountId,
                    partyId: l.partyId ?? null,
                    debit: l.debit,
                    credit: l.credit,
                    description: l.description,
                    sortOrder: l.sortOrder,
                })),
            },
        },
    });

    await updateAccountBalances(tx, input.lines);

    return entry;
}
