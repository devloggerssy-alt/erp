/** A single balanced-entry line a policy hands back to the facade. */
export interface JournalLineDraft {
    accountId: string;
    debit: number;
    credit: number;
    description: string | null;
    sortOrder: number;
    partyId?: string | null;
    cashboxId?: string | null;
    bankAccountId?: string | null;
    currencyId?: string | null;
    /** Transaction-currency amount; direction implied by debit/credit. */
    amount?: number;
    /** Locked rate to base for this line. */
    exchangeRate?: number;
}
