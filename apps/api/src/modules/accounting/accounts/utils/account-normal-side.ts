import type { AccountType } from '@devloggers/db-prisma';

/**
 * Signed balance delta for a journal line, respecting the account's normal side
 * and any contra inversion.
 *
 * Normal balance rules:
 *   - ASSET / EXPENSE → debit-normal (debit increases, credit decreases)
 *   - LIABILITY / EQUITY / REVENUE → credit-normal (credit increases, debit decreases)
 *
 * Contra accounts invert their normal side:
 *   - Accumulated Depreciation (ASSET contra) is credit-normal
 *   - Sales Returns (REVENUE contra) is debit-normal
 */
export function getAccountBalanceDelta(
    type: AccountType,
    isContra: boolean,
    debit: number,
    credit: number,
): number {
    const isDebitNormal = (type === 'ASSET' || type === 'EXPENSE') !== isContra;
    return isDebitNormal ? debit - credit : credit - debit;
}