import type { JournalLineInput } from '../expenses/expense-journal';

export interface PaymentJournalInput {
    type: 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT';
    amount: number;
    exchangeRate: number;
    /** Cashbox linked ChartOfAccount id. */
    cashboxAccountId: string;
    /**
     * The AR account (RECEIPT) or AP account (PAYMENT / ADJUSTMENT).
     * For ADJUSTMENT without a party this is the same as the AR/AP fallback.
     */
    counterpartAccountId: string;
    partyId: string | null;
}

/**
 * Build balanced double-entry lines for a payment (forward direction).
 *
 * RECEIPT (customer pays us):
 *   DR  Cashbox (cash)        = amount × rate
 *   CR  Accounts Receivable   = amount × rate  (partyId set for sub-ledger)
 *
 * PAYMENT / ADJUSTMENT (we pay out):
 *   DR  Accounts Payable      = amount × rate  (partyId set for sub-ledger)
 *   CR  Cashbox (cash)        = amount × rate
 *
 * Reversals are produced by JournalPostingService.reverse, which swaps the
 * credited/debited sides from the stored original — so this builder is forward-only.
 */
export function buildPaymentJournalLines(
    input: PaymentJournalInput,
): (JournalLineInput & { partyId?: string | null })[] {
    const amountBase = round(input.amount * input.exchangeRate);
    const isReceipt = input.type === 'RECEIPT';

    return [
        {
            accountId: isReceipt ? input.cashboxAccountId : input.counterpartAccountId,
            debit: amountBase,
            credit: 0,
            description: null,
            sortOrder: 0,
            partyId: isReceipt ? null : input.partyId,
        },
        {
            accountId: isReceipt ? input.counterpartAccountId : input.cashboxAccountId,
            debit: 0,
            credit: amountBase,
            description: null,
            sortOrder: 1,
            partyId: isReceipt ? input.partyId : null,
        },
    ];
}

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}
