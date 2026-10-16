import { useQuery } from "@tanstack/react-query"
import { currencyResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"

export function useDashboardBaseCurrency() {
    const api = useApi()
    return useQuery({
        queryKey: [currencyResource.key],
        queryFn: () => api[currencyResource.key].list({ page: 1, limit: 1000 }),
        select: (res) => res?.data?.find((currency) => currency.isBase) ?? null,
        staleTime: 5 * 60 * 1000,
    })
}
