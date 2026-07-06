import { useQuery } from "@tanstack/react-query"
import { accountResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import type { AccountListItem } from "../accounts.types"

export const ACCOUNT_TREE_KEY = ["account-tree"] as const

type RawTreeItem = {
    id: string
    code: string
    name: string
    nameI18n?: unknown
    type: AccountListItem["type"]
    parentId: string | null
    isActive: boolean
}

export function useAccountTree() {
    const api = useApi()
    return useQuery({
        queryKey: ACCOUNT_TREE_KEY,
        queryFn: () => api[accountResource.key].tree(),
        staleTime: 60_000,
        select: (res): AccountListItem[] => {
            const rows = (((res as { data?: unknown })?.data ?? []) as unknown) as RawTreeItem[]
            return rows.map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                nameI18n: (r.nameI18n as AccountListItem["nameI18n"]) ?? null,
                type: r.type,
                parentId: r.parentId ?? null,
                isActive: r.isActive,
            }))
        },
    })
}
