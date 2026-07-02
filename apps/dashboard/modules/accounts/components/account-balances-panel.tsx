"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"
import { buildChildrenIndex, getChildRows, getBreadcrumbPath } from "../lib/account-balances"
import { ACCOUNT_TYPE_ORDER, accountTypeMeta } from "../lib/account-types"
import { AccountBreadcrumb } from "./account-breadcrumb"
import { AccountBalancesTable } from "./account-balances-table"
import { AccountLedgerView } from "./account-ledger-view"
import type { AccountBalanceItem } from "../accounts.types"

export function AccountBalancesPanel({
    items,
    selectedId,
    onSelectAccount,
}: {
    items: AccountBalanceItem[]
    selectedId: string | null
    onSelectAccount: (id: string | null) => void
}) {
    const t = useTranslations("business.resources.accounts")
    const [ledgerAccount, setLedgerAccount] = useState<AccountBalanceItem | null>(null)

    // Leaving the current account closes any open ledger.
    useEffect(() => { setLedgerAccount(null) }, [selectedId])

    const index = useMemo(() => buildChildrenIndex(items), [items])
    const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
    const crumbs = useMemo(() => getBreadcrumbPath(byId, selectedId), [byId, selectedId])
    const rows = useMemo(() => getChildRows(index, selectedId), [index, selectedId])

    const selected = selectedId ? byId.get(selectedId) : undefined

    if (ledgerAccount) {
        return (
            <div className="rounded-lg border bg-card p-4">
                <AccountLedgerView account={ledgerAccount} onBack={() => setLedgerAccount(null)} />
            </div>
        )
    }

    return (
        <div className="space-y-4 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <AccountBreadcrumb crumbs={crumbs} onSelect={onSelectAccount} />
                {selected && (
                    <div className={cn(
                        "font-mono text-sm tabular-nums",
                        selected.rolledBalance < 0 ? "text-destructive" : "text-foreground",
                    )}>
                        {selected.rolledBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                )}
            </div>

            {selectedId === null ? (
                <div className="space-y-6">
                    {ACCOUNT_TYPE_ORDER.map((type) => {
                        const typeRows = rows.filter((r) => r.type === type)
                        if (typeRows.length === 0) return null
                        const meta = accountTypeMeta(type)
                        const Icon = meta.icon
                        return (
                            <section key={type}>
                                <header className="mb-2 flex items-center gap-2 px-1">
                                    <Icon className={cn("size-4", meta.badgeClass.split(" ").find((c) => c.startsWith("text-")))} />
                                    <h3 className="text-sm font-semibold">{t(`types.${meta.labelKey}`)}</h3>
                                </header>
                                <AccountBalancesTable
                                    rows={typeRows}
                                    index={index}
                                    onDrill={onSelectAccount}
                                    onOpenLedger={setLedgerAccount}
                                />
                            </section>
                        )
                    })}
                </div>
            ) : (
                <AccountBalancesTable
                    rows={rows}
                    index={index}
                    onDrill={onSelectAccount}
                    onOpenLedger={setLedgerAccount}
                />
            )}
        </div>
    )
}
