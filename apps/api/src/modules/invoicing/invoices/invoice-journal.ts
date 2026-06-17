import type { JournalLineInput } from '../expenses/expense-journal';

export interface InvoiceJournalInput {
    direction: 'PURCHASE' | 'SALE';
    /** Net amount = subtotal - discountAmount (what hits the revenue/purchase account). */
    netAmount: number;
    taxAmount: number;
    total: number;
    exchangeRate: number;
    /** Accounts Receivable account (SALE invoices). */
    receivableAccountId: string;
    /** Accounts Payable account (PURCHASE invoices). */
    payableAccountId: string;
    salesAccountId: string;
    purchaseAccountId: string;
    /** May be null if the tenant has not configured a tax account. */
    taxAccountId: string | null;
    partyId: string;
}

/**
 * Build balanced double-entry lines for an invoice.
 *
 * SALE:
 *   DR  Accounts Receivable  = total × rate   (partyId set for sub-ledger)
 *   CR  Revenue              = netAmount × rate
 *   CR  Tax Payable          = taxAmount × rate  [only when taxAmount > 0]
 *
 * PURCHASE:
 *   DR  Purchase/Expense     = netAmount × rate
 *   DR  Input Tax            = taxAmount × rate  [only when taxAmount > 0]
 *   CR  Accounts Payable     = total × rate      (partyId set for sub-ledger)
 *
 * When reverse=true the debit/credit sides are swapped (cancellation entry).
 */
export function buildInvoiceJournalLines(
    input: InvoiceJournalInput,
    opts: { reverse?: boolean } = {},
): (JournalLineInput & { partyId?: string })[] {
    const rev = opts.reverse ?? false;
    const rate = input.exchangeRate;
    const totalBase = round(input.total * rate);
    const netBase = round(input.netAmount * rate);
    const taxBase = round(input.taxAmount * rate);

    if (input.direction === 'SALE') {
        const lines: (JournalLineInput & { partyId?: string })[] = [
            {
                accountId: input.receivableAccountId,
                debit: rev ? 0 : totalBase,
                credit: rev ? totalBase : 0,
                description: null,
                sortOrder: 0,
                partyId: input.partyId,
            },
            {
                accountId: input.salesAccountId,
                debit: rev ? netBase : 0,
                credit: rev ? 0 : netBase,
                description: null,
                sortOrder: 1,
            },
        ];
        if (taxBase > 0 && input.taxAccountId) {
            lines.push({
                accountId: input.taxAccountId,
                debit: rev ? taxBase : 0,
                credit: rev ? 0 : taxBase,
                description: null,
                sortOrder: 2,
            });
        }
        return lines;
    }

    // PURCHASE
    const lines: (JournalLineInput & { partyId?: string })[] = [
        {
            accountId: input.purchaseAccountId,
            debit: rev ? 0 : netBase,
            credit: rev ? netBase : 0,
            description: null,
            sortOrder: 0,
        },
    ];
    if (taxBase > 0 && input.taxAccountId) {
        lines.push({
            accountId: input.taxAccountId,
            debit: rev ? 0 : taxBase,
            credit: rev ? taxBase : 0,
            description: null,
            sortOrder: 1,
        });
    }
    lines.push({
        accountId: input.payableAccountId,
        debit: rev ? totalBase : 0,
        credit: rev ? 0 : totalBase,
        description: null,
        sortOrder: lines.length,
        partyId: input.partyId,
    });
    return lines;
}

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}
