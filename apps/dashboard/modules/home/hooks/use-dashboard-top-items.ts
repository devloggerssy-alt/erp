import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardTopItems(from?: string, to?: string, limit = 5) {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "top-items", from, to, limit],
        queryFn: () => api.dashboard.topItems({ from, to, limit }),
    })
}
