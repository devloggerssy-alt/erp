import type { PostingJournalLine } from './create-posting-journal-entry';

function round(v: number): number {
    return Math.round(v * 10000) / 10000;
}

/** Sales COGS leg: DR COGS / CR Inventory at base-currency cost. */
export function buildCogsJournalLines(
    input: { cogsAccountId: string; inventoryAccountId: string; amount: number },
    opts: { reverse?: boolean } = {},
): PostingJournalLine[] {
    const rev = opts.reverse ?? false;
    const amt = round(input.amount);
    return [
        { accountId: input.cogsAccountId, debit: rev ? 0 : amt, credit: rev ? amt : 0, description: null, sortOrder: 0 },
        { accountId: input.inventoryAccountId, debit: rev ? amt : 0, credit: rev ? 0 : amt, description: null, sortOrder: 1 },
    ];
}

/** Stock-count variance: netAmount > 0 = surplus (Inventory up), < 0 = shortage. */
export function buildStockCountVarianceLines(
    input: { inventoryAccountId: string; adjustmentAccountId: string; netAmount: number },
): PostingJournalLine[] {
    const amt = round(Math.abs(input.netAmount));
    const surplus = input.netAmount > 0;
    return [
        { accountId: input.inventoryAccountId, debit: surplus ? amt : 0, credit: surplus ? 0 : amt, description: null, sortOrder: 0 },
        { accountId: input.adjustmentAccountId, debit: surplus ? 0 : amt, credit: surplus ? amt : 0, description: null, sortOrder: 1 },
    ];
}

/** Opening inventory: DR Inventory / CR Opening Balance Equity. */
export function buildOpeningBalanceLines(
    input: { inventoryAccountId: string; openingEquityAccountId: string; amount: number },
): PostingJournalLine[] {
    const amt = round(input.amount);
    return [
        { accountId: input.inventoryAccountId, debit: amt, credit: 0, description: null, sortOrder: 0 },
        { accountId: input.openingEquityAccountId, debit: 0, credit: amt, description: null, sortOrder: 1 },
    ];
}
