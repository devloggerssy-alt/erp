"use client"

import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { accountTypeMeta } from "../lib/account-types"
import { hasChildren } from "../lib/account-balances"
import type { AccountBalanceItem } from "../accounts.types"

function formatBalance(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AccountBalancesTable({
    rows,
    index,
    showType,
    onDrill,
    onOpenLedger,
}: {
    rows: AccountBalanceItem[]
    index: Map<string, AccountBalanceItem[]>
    showType?: boolean
    onDrill: (id: string) => void
    onOpenLedger: (row: AccountBalanceItem) => void
}) {
    const t = useTranslations("business.resources.accounts")

    if (rows.length === 0) {
        return <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("balances.empty")}</p>
    }

    return (
        <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                        <th className="px-3 py-2 text-start font-medium">{t("balances.columnCode")}</th>
                        <th className="px-3 py-2 text-start font-medium">{t("balances.columnName")}</th>
                        {showType && <th className="px-3 py-2 text-start font-medium">{t("balances.columnType")}</th>}
                        <th className="px-3 py-2 text-end font-medium">{t("balances.columnBalance")}</th>
                        <th className="w-8" />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const parent = hasChildren(index, row.id)
                        const meta = accountTypeMeta(row.type)
                        return (
                            <tr
                                key={row.id}
                                onClick={() => (parent ? onDrill(row.id) : onOpenLedger(row))}
                                className="cursor-pointer border-t transition-colors hover:bg-muted/40"
                            >
                                <td className="px-3 py-2">
                                    <code className="font-mono text-xs text-muted-foreground">{row.code}</code>
                                </td>
                                <td className="px-3 py-2">
                                    <span className={cn(!row.isActive && "text-muted-foreground line-through")}>{row.name}</span>
                                    {!row.isActive && (
                                        <Badge variant="outline" className="ms-2 text-[10px]">{t("inactive")}</Badge>
                                    )}
                                </td>
                                {showType && (
                                    <td className="px-3 py-2">
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className={cn("size-1.5 rounded-full", meta.dotClass)} aria-hidden />
                                            {t(`types.${meta.labelKey}`)}
                                        </span>
                                    </td>
                                )}
                                <td className={cn(
                                    "px-3 py-2 text-end font-mono tabular-nums",
                                    row.rolledBalance < 0 ? "text-destructive" : "text-foreground",
                                )}>
                                    {formatBalance(row.rolledBalance)}
                                </td>
                                <td className="pe-2 text-muted-foreground">
                                    {parent && <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
