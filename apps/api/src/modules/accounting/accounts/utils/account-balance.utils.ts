import type { AccountType } from '@devloggers/db-prisma';

/**
 * Returns the net change to currentBalance for an account based on its normal balance side.
 *
 * Normal balance rules:
 *   - ASSET / EXPENSE    → debit-normal  (debit increases, credit decreases)
 *   - LIABILITY / EQUITY / REVENUE → credit-normal (credit increases, debit decreases)
 */
export function getAccountBalanceDelta(type: AccountType, debit: number, credit: number): number {
    const isDebitNormal = type === 'ASSET' || type === 'EXPENSE';
    return isDebitNormal ? debit - credit : credit - debit;
}

/**
 * Increments currentBalance on each affected account within the given Prisma transaction.
 * Call this after creating all JournalLines in the same $transaction.
 */
export async function updateAccountBalances(
    tx: { chartOfAccount: { findUnique: Function; update: Function } },
    lines: Array<{ accountId: string; debit: number; credit: number }>,
): Promise<void> {
    for (const line of lines) {
        const account = await tx.chartOfAccount.findUnique({
            where: { id: line.accountId },
            select: { type: true },
        });
        if (!account) continue;
        const delta = getAccountBalanceDelta(account.type as AccountType, line.debit, line.credit);
        if (delta !== 0) {
            await tx.chartOfAccount.update({
                where: { id: line.accountId },
                data: { currentBalance: { increment: delta } },
            });
        }
    }
}
