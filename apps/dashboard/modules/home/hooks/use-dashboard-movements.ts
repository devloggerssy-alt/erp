import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

export function useDashboardMovements() {
    const api = useApi()
    return useQuery({
        queryKey: ["dashboard", "movements"],
        queryFn: () =>
            api.payments.list({
                filters: { status: { $eq: "POSTED" } },
                limit: 10,
                page: 1,
            }),
    })
}
