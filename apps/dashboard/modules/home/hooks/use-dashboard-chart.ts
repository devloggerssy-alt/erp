import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardChart(from?: string, to?: string) {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "chart", from, to],
        queryFn: () =>
            api.dashboard.chartData(from || to ? { from, to } : undefined),
    })
}
