/**
 * Thin re-exports of the pure line-building math now embedded in
 * StockCountAdjustedPolicy / OpeningBalancePolicy / OpeningStockPolicy /
 * InvoicePostedPolicy, kept importable under their pre-Phase-1 names so
 * golden-master.spec.ts's paths-8-10 pinning (which never went through a
 * live service, only the math) doesn't need to change at all. Test-only.
 */
function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

export function buildStockCountVarianceLines(input: { inventoryAccountId: string; adjustmentAccountId: string; netAmount: number }) {
    const amt = round(Math.abs(input.netAmount));
    const surplus = input.netAmount > 0;
    return [
        { accountId: input.inventoryAccountId, debit: surplus ? amt : 0, credit: surplus ? 0 : amt, description: null, sortOrder: 0 },
        { accountId: input.adjustmentAccountId, debit: surplus ? 0 : amt, credit: surplus ? amt : 0, description: null, sortOrder: 1 },
    ];
}

export function buildOpeningBalanceLines(input: { inventoryAccountId: string; openingEquityAccountId: string; amount: number }) {
    const amt = round(input.amount);
    return [
        { accountId: input.inventoryAccountId, debit: amt, credit: 0, description: null, sortOrder: 0 },
        { accountId: input.openingEquityAccountId, debit: 0, credit: amt, description: null, sortOrder: 1 },
    ];
}

export function buildCogsJournalLines(
    input: { cogsAccountId: string; inventoryAccountId: string; amount: number },
    opts: { reverse?: boolean } = {},
) {
    const rev = opts.reverse ?? false;
    const amt = round(input.amount);
    return [
        { accountId: input.cogsAccountId, debit: rev ? 0 : amt, credit: rev ? amt : 0, description: null, sortOrder: 0 },
        { accountId: input.inventoryAccountId, debit: rev ? amt : 0, credit: rev ? 0 : amt, description: null, sortOrder: 1 },
    ];
}
