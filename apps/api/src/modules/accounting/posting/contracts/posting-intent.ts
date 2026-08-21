/**
 * Discriminated union of every economic event a non-accounting module can
 * report to `AccountingPostingFacade`. Fields describe *what happened*
 * (amounts, quantities, party, direction) — never which GL account it hits.
 *
 * Two exceptions carry an `accountId`, by deliberate design, not oversight:
 * `ExpenseRecordedIntent.items[].accountId` and
 * `OpeningBalancePostedIntent.entries[].accountId`. In both cases the account
 * is direct user input at the API boundary (the DTO already carries it) —
 * there is no fallback/override resolution logic to move into a policy, only
 * validation. See Task 6 and Task 8 for the full reasoning.
 */
export interface PostingIntentBase {
    tenantId: string;
    userId: string;
    /** Also used as the reversal date for cancellation intents. */
    date: Date;
    fiscalPeriodId: string;
    fiscalPeriodStatus: string | undefined;
    exchangeRate: number;
    /** The id of the domain entity this posting is about (invoice id, payment id, …). */
    referenceId: string;
    description: string;
}

export interface InvoicePostedIntent extends PostingIntentBase {
    kind: 'INVOICE_POSTED';
    direction: 'PURCHASE' | 'SALE';
    partyId: string;
    /** Invoice transaction currency. */
    currencyId: string;
    /** subtotal - discountAmount, invoice currency. */
    netAmount: number;
    taxAmount: number;
    total: number;
    /** PURCHASE only: stock-line net (tax-exclusive) capitalised to Inventory. */
    inventoryAmount?: number;
    /** SALE only: cost of goods sold, computed by the caller from average cost during movement posting. */
    cogsTotal?: number;
}

export interface InvoiceCancelledIntent extends PostingIntentBase {
    kind: 'INVOICE_CANCELLED';
    originalEntryId: string;
}

export interface PaymentRecordedIntent extends PostingIntentBase {
    kind: 'PAYMENT_RECORDED';
    type: 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT';
    partyId: string | null;
    amount: number;
    cashboxId: string;
    currencyId: string;
}

export interface PaymentCancelledIntent extends PostingIntentBase {
    kind: 'PAYMENT_CANCELLED';
    originalEntryId: string;
}

export interface ExpenseRecordedIntent extends PostingIntentBase {
    kind: 'EXPENSE_RECORDED';
    cashboxId: string;
    currencyId: string;
    /** Total in transaction currency; policy computes base = txn × rate. */
    totalAmount: number;
    /** Each item's `accountId` is direct user input from `CreateExpenseItemDto` — see contracts/posting-intent.ts header. */
    items: { accountId: string; amount: number; description: string; sortOrder: number }[];
}

export interface ExpenseCancelledIntent extends PostingIntentBase {
    kind: 'EXPENSE_CANCELLED';
    originalEntryId: string;
}

export interface StockCountAdjustedIntent extends PostingIntentBase {
    kind: 'STOCK_COUNT_ADJUSTED';
    /** Positive = surplus, negative = shortage, already valued at average cost. */
    netVariance: number;
}

export interface OpeningBalancePostedIntent extends PostingIntentBase {
    kind: 'OPENING_BALANCE_POSTED';
    /** Direct user input — see contracts/posting-intent.ts header. Pre-filtered to non-zero amounts by the caller. */
    entries: { accountId: string; amount: number; cashboxId?: string | null; bankAccountId?: string | null; currencyId?: string | null; exchangeRate?: number }[];
}

export interface OpeningStockPostedIntent extends PostingIntentBase {
    kind: 'OPENING_STOCK_POSTED';
    totalValue: number;
}

export type PostingRecordIntent =
    | InvoicePostedIntent
    | PaymentRecordedIntent
    | ExpenseRecordedIntent
    | StockCountAdjustedIntent
    | OpeningBalancePostedIntent
    | OpeningStockPostedIntent;

export type PostingCancellationIntent =
    | InvoiceCancelledIntent
    | PaymentCancelledIntent
    | ExpenseCancelledIntent;

export type PostingIntent = PostingRecordIntent | PostingCancellationIntent;
