import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardSummary(from?: string, to?: string) {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "summary", from, to],
        queryFn: () =>
            api.dashboard.summary(from || to ? { from, to } : undefined),
    })
}
