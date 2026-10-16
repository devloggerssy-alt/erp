import { useQuery } from "@tanstack/react-query"
import { currencyResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"

/**
 * Tenant currencies list, cached under the currency resource key so it is
 * fetched once and shared across the dashboard (resource selects, base-currency
 * lookups, exchange-rate inputs).
 */
export function useCurrencies() {
  const api = useApi()
  return useQuery({
    queryKey: [currencyResource.key],
    queryFn: () => api[currencyResource.key].list({ page: 1, limit: 1000 }),
    select: (res) => res?.data ?? [],
    staleTime: 5 * 60 * 1000,
  })
}
