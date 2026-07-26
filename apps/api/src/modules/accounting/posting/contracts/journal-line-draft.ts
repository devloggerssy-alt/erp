/** A single balanced-entry line a policy hands back to the facade. */
export interface JournalLineDraft {
    accountId: string;
    debit: number;
    credit: number;
    description: string | null;
    sortOrder: number;
    partyId?: string | null;
}
