"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAccountLedger } from "../hooks"
import type { AccountBalanceItem } from "../accounts.types"

function fmt(n: number): string {
    return n === 0 ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AccountLedgerView({ account, onBack }: { account: AccountBalanceItem; onBack: () => void }) {
    const t = useTranslations("business.resources.accounts")
    const [page, setPage] = useState(1)
    const limit = 50
    const { data, isLoading } = useAccountLedger(account.id, page, limit)

    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft className="size-4 rtl:rotate-180" />
                    {t("ledger.back")}
                </Button>
                <div className="text-end">
                    <div className="text-sm font-medium">
                        <code className="font-mono text-xs text-muted-foreground">{account.code}</code> {account.name}
                    </div>
                    <div className={cn("font-mono text-xs tabular-nums", account.rolledBalance < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {t("ledger.balanceLabel")}: {account.rolledBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-1">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                </div>
            ) : (data?.data.length ?? 0) === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("ledger.empty")}</p>
            ) : (
                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2 text-start font-medium">{t("ledger.date")}</th>
                                <th className="px-3 py-2 text-start font-medium">{t("ledger.entry")}</th>
                                <th className="px-3 py-2 text-start font-medium">{t("ledger.description")}</th>
                                <th className="px-3 py-2 text-end font-medium">{t("ledger.debit")}</th>
                                <th className="px-3 py-2 text-end font-medium">{t("ledger.credit")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data!.data.map((line) => (
                                <tr key={line.id} className="border-t">
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                        {new Date(line.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 py-2">
                                        <code className="font-mono text-xs">{line.entryNumber}</code>
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">{line.description ?? "—"}</td>
                                    <td className="px-3 py-2 text-end font-mono tabular-nums">{fmt(line.debit)}</td>
                                    <td className="px-3 py-2 text-end font-mono tabular-nums">{fmt(line.credit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {total > limit && (
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                    <span>{t("ledger.pageOf", { page, total: totalPages })}</span>
                    <Button type="button" variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        <ChevronLeft className="size-4 rtl:rotate-180" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        <ChevronRight className="size-4 rtl:rotate-180" />
                    </Button>
                </div>
            )}
        </div>
    )
}
