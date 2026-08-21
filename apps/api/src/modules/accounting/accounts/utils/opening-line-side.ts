import type { AccountType } from '@devloggers/db-prisma';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/**
 * Base-currency debit/credit split for an opening line.
 * A positive amount increases the account's normal side (ASSET → debit,
 * LIABILITY/EQUITY → credit); a negative amount reverses it.
 * `baseAmount = |amount| × exchangeRate`, rounded to @db.Decimal(18,4).
 */
export function openingLineSide(
    type: AccountType,
    amount: number,
    exchangeRate: number,
): { debit: number; credit: number; baseAmount: number } {
    const baseAmount = round(Math.abs(amount) * exchangeRate);
    const isIncrease = amount > 0;
    const isDebitNormal = type === 'ASSET';
    const debit = isIncrease === isDebitNormal ? baseAmount : 0;
    const credit = isIncrease === isDebitNormal ? 0 : baseAmount;
    return { debit, credit, baseAmount };
}