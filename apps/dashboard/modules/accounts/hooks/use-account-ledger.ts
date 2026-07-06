import { useQuery } from "@tanstack/react-query"
import { accountResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import type { AccountLedgerLine } from "../accounts.types"

export type AccountLedgerPage = {
    data: AccountLedgerLine[]
    total: number
    page: number
    limit: number
}

export function useAccountLedger(accountId: string | null, page: number, limit = 50) {
    const api = useApi()
    return useQuery({
        queryKey: ["account-ledger", accountId, page, limit],
        enabled: !!accountId,
        queryFn: () => api[accountResource.key].ledger(accountId as string, { page, limit }),
        select: (res): AccountLedgerPage => {
            const anyRes = res as unknown as {
                data?: AccountLedgerLine[]
                meta?: { pagination?: { total?: number; page?: number; limit?: number } }
            }
            const pagination = anyRes.meta?.pagination
            return {
                data: (anyRes.data ?? []) as AccountLedgerLine[],
                total: pagination?.total ?? 0,
                page: pagination?.page ?? page,
                limit: pagination?.limit ?? limit,
            }
        },
    })
}
