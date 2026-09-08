"use client"

import { useQuery } from "@tanstack/react-query"

export type DashboardData = Record<string, unknown> & {
    [K: string]: unknown
}

export function useDashboardData() {
    return useQuery<DashboardData>({
        queryKey: ["home", "dashboard"],
        queryFn: () => Promise.resolve({} as DashboardData),
    })
}
