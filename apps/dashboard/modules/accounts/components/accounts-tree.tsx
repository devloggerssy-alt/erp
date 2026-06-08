"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { IconTooltip } from "@/shared/components/icon-tooltip"
import { buildAccountTree, filterAccountTree, collectExpandableIds } from "../lib/build-account-tree"
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

    // Manually toggled nodes (persists across searches); matched ancestors are
    // additionally force-expanded while a search is active (merged at render time
    // so we don't need to synchronize state from a derived value in an effect).
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const effectiveExpanded = useMemo(() => {
        if (expandIds.size === 0) return expanded
        const merged = new Set(expanded)
        for (const id of expandIds) merged.add(id)
        return merged
    }, [expanded, expandIds])

    const toggle = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev)
            if (effectiveExpanded.has(id)) next.delete(id)
            else next.add(id)
            return next
        })

    const expandAll = () => setExpanded(new Set(collectExpandableIds(buckets)))
    const collapseAll = () => setExpanded(new Set())

    const isEmpty = filtered.every((b) => b.nodes.length === 0)
    if (isEmpty) {
        return <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>
    }

    return (
        <div className="space-y-4">
            {mode === "manage" && (
                <div className="flex items-center gap-1">
                    <IconTooltip label={t("expandAll")}>
                        <Button type="button" variant="ghost" size="icon" onClick={expandAll}>
                            <ChevronsUpDown className="size-4" />
                        </Button>
                    </IconTooltip>
                    <IconTooltip label={t("collapseAll")}>
                        <Button type="button" variant="ghost" size="icon" onClick={collapseAll}>
                            <ChevronsDownUp className="size-4" />
                        </Button>
                    </IconTooltip>
                </div>
            )}
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
                                    expanded={effectiveExpanded}
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
