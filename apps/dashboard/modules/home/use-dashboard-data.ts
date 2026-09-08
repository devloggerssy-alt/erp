"use client"

import { useQuery } from "@tanstack/react-query"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DashboardData = Record<string, any>

export function useDashboardData() {
    return useQuery<DashboardData>({
        queryKey: ["home", "dashboard"],
        queryFn: () => Promise.resolve({} as DashboardData),
    })
}
