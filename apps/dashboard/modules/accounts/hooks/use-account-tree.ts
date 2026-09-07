import { useQuery } from "@tanstack/react-query"
import { accountResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import type { AccountListItem } from "../accounts.types"

export const ACCOUNT_TREE_KEY = ["account-tree"] as const

// NOTE: `tree()`'s generated element type reports `nameI18n: Record<string, never>`
// instead of `LocalizedStringDto`, because the backend's `ChartOfAccountTreeDto.nameI18n`
// (apps/api/src/modules/accounting/accounts/dto/account.dto.ts) declares
// `@ApiProperty({ description: '...' })` without a `type` option — the exact anti-pattern
// documented in .ai/rules/api.md ("No type option — generates Record<string, never>").
// The runtime value IS a real LocalizedString (see AccountPresenter.toResponse), so this
// is a generated-type bug, not an actual data-shape difference. Escalated in
// .superpowers/sdd/task-7-report.md rather than patched here with a cast, since a
// type-honest fix would have to null out nameI18n and silently break locale-resolved
// labels in the account tree view. Fix the source DTO + `pnpm generate` + rebuild
// api-contracts, then this hook can drop the manual mapping like balances/ledger did.
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
