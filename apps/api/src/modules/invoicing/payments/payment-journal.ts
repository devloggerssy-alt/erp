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
 * Build balanced double-entry lines for a payment.
 *
 * RECEIPT (customer pays us):
 *   DR  Cashbox (cash)        = amount × rate
 *   CR  Accounts Receivable   = amount × rate  (partyId set for sub-ledger)
 *
 * PAYMENT / ADJUSTMENT (we pay out):
 *   DR  Accounts Payable      = amount × rate  (partyId set for sub-ledger)
 *   CR  Cashbox (cash)        = amount × rate
 *
 * When reverse=true the debit/credit sides are swapped (cancellation entry).
 */
export function buildPaymentJournalLines(
    input: PaymentJournalInput,
    opts: { reverse?: boolean } = {},
): (JournalLineInput & { partyId?: string | null })[] {
    const rev = opts.reverse ?? false;
    const amountBase = round(input.amount * input.exchangeRate);
    const isReceipt = input.type === 'RECEIPT';

    return [
        {
            accountId: isReceipt ? input.cashboxAccountId : input.counterpartAccountId,
            debit: rev ? 0 : amountBase,
            credit: rev ? amountBase : 0,
            description: null,
            sortOrder: 0,
            partyId: isReceipt ? null : input.partyId,
        },
        {
            accountId: isReceipt ? input.counterpartAccountId : input.cashboxAccountId,
            debit: rev ? amountBase : 0,
            credit: rev ? 0 : amountBase,
            description: null,
            sortOrder: 1,
            partyId: isReceipt ? input.partyId : null,
        },
    ];
}

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}
