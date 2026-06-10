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
 * Build balanced double-entry lines for an expense.
 * Normal: each item is a DEBIT to its expense account; the cashbox asset account is CREDITed the total.
 * Reverse (cancellation): debit/credit sides are swapped.
 */
export function buildExpenseJournalLines(
    input: ExpenseJournalInput,
    opts: { reverse?: boolean } = {},
): JournalLineInput[] {
    const reverse = opts.reverse ?? false;

    const itemLines: JournalLineInput[] = input.items.map((item) => ({
        accountId: item.accountId,
        debit: reverse ? 0 : item.amount,
        credit: reverse ? item.amount : 0,
        description: item.description,
        sortOrder: item.sortOrder,
    }));

    const cashboxLine: JournalLineInput = {
        accountId: input.cashboxAccountId,
        debit: reverse ? input.totalAmount : 0,
        credit: reverse ? 0 : input.totalAmount,
        description: null,
        sortOrder: input.items.length,
    };

    return [...itemLines, cashboxLine];
}
