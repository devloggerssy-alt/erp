import { useQuery } from "@tanstack/react-query"
import { accountResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import type { AccountBalanceItem } from "../accounts.types"

export const ACCOUNT_BALANCES_KEY = ["account-balances"] as const

export function useAccountBalances() {
    const api = useApi()
    return useQuery({
        queryKey: ACCOUNT_BALANCES_KEY,
        queryFn: () => api[accountResource.key].balances(),
        staleTime: 30_000,
        select: (res): AccountBalanceItem[] => {
            const rows = res.data ?? []
            return rows.map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                nameI18n: r.nameI18n ?? null,
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
