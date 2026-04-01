"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuthApi } from "@/shared/useApi"
import type { HomeDashboardResponse } from "@garage/api"

export type DashboardData = HomeDashboardResponse

export function useDashboardData() {
    const api = useAuthApi()

    return useQuery<DashboardData>({
        queryKey: ["home", "dashboard"],
        queryFn: () => api.home.dashboard(),
    })
}
