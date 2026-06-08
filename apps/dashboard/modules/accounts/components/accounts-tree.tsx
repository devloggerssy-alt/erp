"use client"

import { useMemo, useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { buildAccountTree, filterAccountTree } from "../lib/build-account-tree"
import { ACCOUNT_TYPE_ORDER, accountTypeMeta } from "../lib/account-types"
import type { AccountListItem, AccountTreeNode } from "../accounts.types"
import { AccountTreeNodeRow, type AccountNodeActions } from "./account-tree-node"

type Props = {
    items: AccountListItem[]
    query: string
    mode: "manage" | "select"
    selectedId?: string | null
    onSelect?: (node: AccountTreeNode) => void
    selectable?: (node: AccountTreeNode) => boolean
    actions?: AccountNodeActions
    /** Hide deactivated accounts entirely (picker default). */
    hideInactive?: boolean
}

const defaultSelectable = (node: AccountTreeNode) => node.isLeaf && node.account.isActive

export function AccountsTree({
    items,
    query,
    mode,
    selectedId,
    onSelect,
    selectable = defaultSelectable,
    actions,
    hideInactive = false,
}: Props) {
    const locale = useLocale()
    const t = useTranslations("business.resources.accounts")

    const visibleItems = useMemo(
        () => (hideInactive ? items.filter((i) => i.isActive) : items),
        [items, hideInactive],
    )

    const buckets = useMemo(() => buildAccountTree(visibleItems, locale), [visibleItems, locale])
    const { buckets: filtered, expandIds } = useMemo(() => filterAccountTree(buckets, query), [buckets, query])

    // Type buckets expand by default; matched ancestors force-expand during search.
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    useEffect(() => {
        if (expandIds.size > 0) setExpanded((prev) => new Set([...prev, ...expandIds]))
    }, [expandIds])

    const toggle = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })

    const isEmpty = filtered.every((b) => b.nodes.length === 0)
    if (isEmpty) {
        return <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>
    }

    return (
        <div className="space-y-4">
            {ACCOUNT_TYPE_ORDER.map((type) => {
                const bucket = filtered.find((b) => b.type === type)!
                if (bucket.nodes.length === 0) return null
                const meta = accountTypeMeta(type)
                const Icon = meta.icon
                return (
                    <section key={type}>
                        <header className="mb-1 flex items-center gap-2 px-1">
                            <Icon className={cn("size-4", meta.badgeClass.split(" ").find((c) => c.startsWith("text-")))} />
                            <h3 className="text-sm font-semibold">{t(`types.${meta.labelKey}`)}</h3>
                            <Badge variant="outline" className={cn("text-[10px] tabular-nums", meta.badgeClass)}>{bucket.count}</Badge>
                        </header>
                        <div>
                            {bucket.nodes.map((node) => (
                                <AccountTreeNodeRow
                                    key={node.id}
                                    node={node}
                                    mode={mode}
                                    expanded={expanded}
                                    onToggle={toggle}
                                    selectedId={selectedId}
                                    selectable={selectable}
                                    onSelect={onSelect}
                                    actions={actions}
                                />
                            ))}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}

export { defaultSelectable }
