export interface ExpenseJournalItem {
    accountId: string;
    amount: number;
    description: string;
    sortOrder: number;
}

export interface ExpenseJournalInput {
    items: ExpenseJournalItem[];
    cashboxAccountId: string;
    totalAmount: number;
}

export interface JournalLineInput {
    accountId: string;
    debit: number;
    credit: number;
    description: string | null;
    sortOrder: number;
}

/**
 * Build balanced double-entry lines for an expense (forward direction).
 * Each item is a DEBIT to its expense account; the cashbox asset account is CREDITed the total.
 * Reversals are produced by JournalPostingService.reverse from the stored original — forward-only here.
 */
export function buildExpenseJournalLines(
    input: ExpenseJournalInput,
): JournalLineInput[] {
    const itemLines: JournalLineInput[] = input.items.map((item) => ({
        accountId: item.accountId,
        debit: item.amount,
        credit: 0,
        description: item.description,
        sortOrder: item.sortOrder,
    }));

    const cashboxLine: JournalLineInput = {
        accountId: input.cashboxAccountId,
        debit: 0,
        credit: input.totalAmount,
        description: null,
        sortOrder: input.items.length,
    };

    return [...itemLines, cashboxLine];
}
