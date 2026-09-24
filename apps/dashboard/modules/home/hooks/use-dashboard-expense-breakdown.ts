import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardExpenseBreakdown(from?: string, to?: string) {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "expense-breakdown", from, to],
        queryFn: () =>
            api.dashboard.expenseBreakdown(from || to ? { from, to } : undefined),
    })
}
