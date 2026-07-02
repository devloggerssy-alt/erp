import { useQuery } from "@tanstack/react-query"
import { accountResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import type { AccountBalanceItem } from "../accounts.types"

export const ACCOUNT_BALANCES_KEY = ["account-balances"] as const

type RawBalance = {
    id: string
    code: string
    name: string
    nameI18n?: unknown
    type: AccountBalanceItem["type"]
    parentId: string | null
    isActive: boolean
    ownBalance: number
    rolledBalance: number
}

export function useAccountBalances() {
    const api = useApi()
    return useQuery({
        queryKey: ACCOUNT_BALANCES_KEY,
        queryFn: () => api[accountResource.key].balances(),
        staleTime: 30_000,
        select: (res): AccountBalanceItem[] => {
            const rows = (((res as { data?: unknown })?.data ?? []) as unknown) as RawBalance[]
            return rows.map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                nameI18n: (r.nameI18n as AccountBalanceItem["nameI18n"]) ?? null,
                type: r.type,
                parentId: r.parentId ?? null,
                isActive: r.isActive,
                ownBalance: r.ownBalance,
                rolledBalance: r.rolledBalance,
                // feed the tree's inline balance display with the rolled figure
                currentBalance: r.rolledBalance,
            }))
        },
    })
}
