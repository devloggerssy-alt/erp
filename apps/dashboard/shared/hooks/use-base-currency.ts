import { useCurrencies } from "@/shared/hooks/use-currencies"

/**
 * Resolves the tenant base currency (`isBase === true`) from the shared
 * currencies list.
 */
export function useBaseCurrency() {
  const currencies = useCurrencies()
  return {
    ...currencies,
    data: currencies.data?.find((currency) => currency.isBase) ?? null,
  }
}
