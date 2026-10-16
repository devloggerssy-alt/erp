// Pure helpers for the currency exchange-rate input.
//
// Exchange-rate semantics (see packages/db-prisma/src/schema/invoice.prisma):
//   exchangeRate = value of 1 unit of the DOCUMENT currency expressed in
//   BASE-currency units.  baseAmount = amount x exchangeRate.
//
// Users usually reason in the opposite direction for weak currencies
// (e.g. 1 USD = 13900 SYP  <=>  1 SYP = 0.000072 USD), so the UI exposes both
// reciprocal views and lets the user type whichever number is easiest.

/** Matches the @db.Decimal(18, 6) precision used by the backend. */
export const EXCHANGE_RATE_DECIMALS = 6

function isUsable(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/** Base-currency units for 1 document-currency unit (the stored value itself). */
export function basePerDocument(exchangeRate: number): number | null {
  return isUsable(exchangeRate) ? exchangeRate : null
}

/** Document-currency units for 1 base-currency unit (the reciprocal). */
export function documentPerBase(exchangeRate: number): number | null {
  return isUsable(exchangeRate) ? 1 / exchangeRate : null
}

/** Stored rate from a base-per-document value. */
export function exchangeRateFromBasePerDocument(value: number): number | null {
  return isUsable(value) ? value : null
}

/** Stored rate from a document-per-base value (the reciprocal). */
export function exchangeRateFromDocumentPerBase(value: number): number | null {
  return isUsable(value) ? 1 / value : null
}

/**
 * Parse a user-typed string into a positive number.
 * Returns null for empty / non-numeric / non-positive input so callers can
 * keep the last valid rate while the user is mid-edit.
 */
export function parseExchangeRateInput(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === "") return null
  const value = Number(trimmed)
  return isUsable(value) ? value : null
}

/**
 * Format a rate for display: fixed to the backend precision, then trailing
 * zeros (and a dangling decimal point) removed. Never returns scientific
 * notation so tiny rates stay readable.
 */
export function formatExchangeRate(value: number): string {
  if (!Number.isFinite(value)) return ""
  const fixed = value.toFixed(EXCHANGE_RATE_DECIMALS)
  if (!fixed.includes(".")) return fixed
  return fixed.replace(/0+$/, "").replace(/\.$/, "") || "0"
}
