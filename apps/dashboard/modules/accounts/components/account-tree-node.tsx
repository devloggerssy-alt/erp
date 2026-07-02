"use client"

import { ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { IconTooltip } from "@/shared/components/icon-tooltip"
import { accountTypeMeta } from "../lib/account-types"
import type { AccountTreeNode } from "../accounts.types"

export type AccountNodeActions = {
    onAddChild: (node: AccountTreeNode) => void
    onEdit: (node: AccountTreeNode) => void
    onDelete: (node: AccountTreeNode) => void
}

type Props = {
    node: AccountTreeNode
    mode: "manage" | "select"
    expanded: Set<string>
    onToggle: (id: string) => void
    selectedId?: string | null
    selectable: (node: AccountTreeNode) => boolean
    onSelect?: (node: AccountTreeNode) => void
    actions?: AccountNodeActions
}

export function AccountTreeNodeRow({
    node,
    mode,
    expanded,
    onToggle,
    selectedId,
    selectable,
    onSelect,
    actions,
}: Props) {
    const t = useTranslations("business.resources.accounts")
    const isOpen = expanded.has(node.id)
    const hasChildren = node.children.length > 0
    const meta = accountTypeMeta(node.account.type)

    const isSelectMode = mode === "select"
    const canSelect = isSelectMode && selectable(node)
    const isSelected = selectedId === node.id
    const isDisabledForSelect = isSelectMode && !canSelect

    const handleRowClick = () => {
        if (isSelectMode) {
            if (canSelect) onSelect?.(node)
            else if (hasChildren) onToggle(node.id)
            return
        }
        // manage mode: select the node (drives the balances panel) and expand parents
        onSelect?.(node)
        if (hasChildren) onToggle(node.id)
    }

    return (
        <div>
            <div
                role={canSelect ? "option" : undefined}
                aria-selected={isSelected || undefined}
                aria-disabled={isDisabledForSelect || undefined}
                onClick={handleRowClick}
                className={cn(
                    "group flex items-center gap-2 rounded-md py-1.5 pe-2 text-sm transition-colors",
                    "hover:bg-muted/60",
                    isSelected && "bg-primary/10 ring-1 ring-primary/30",
                    isDisabledForSelect && !hasChildren && "opacity-50",
                    (canSelect || hasChildren) && "cursor-pointer",
                )}
                style={{ paddingInlineStart: `${node.depth * 1.25 + 0.25}rem` }}
            >
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id) }}
                    className={cn("flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground", !hasChildren && "invisible")}
                    aria-label={isOpen ? t("collapse") : t("expand")}
                >
                    <ChevronRight className={cn("size-4 transition-transform rtl:rotate-180", isOpen && "rotate-90 rtl:rotate-90")} />
                </button>

                <span className={cn("size-1.5 shrink-0 rounded-full", meta.dotClass)} aria-hidden />

                <code className="shrink-0 font-mono text-xs text-muted-foreground">{node.account.code}</code>

                <span className={cn("truncate", !node.account.isActive && "text-muted-foreground line-through")}>
                    {node.label}
                </span>

                {!node.account.isActive && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">{t("inactive")}</Badge>
                )}

                {hasChildren && (
                    <Badge variant="secondary" className="ms-auto shrink-0 text-[10px] tabular-nums">{node.children.length}</Badge>
                )}

                {mode === "manage" && node.account.currentBalance != null && (
                    <span className={cn(
                        "shrink-0 font-mono text-xs tabular-nums",
                        hasChildren ? "ms-2" : "ms-auto",
                        node.account.currentBalance < 0 ? "text-destructive" : "text-muted-foreground",
                    )}>
                        {node.account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                )}

                {mode === "manage" && actions && (
                    <div className={cn("flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100", !hasChildren && "ms-auto")}>
                        <IconTooltip label={t("addChild")}>
                            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); actions.onAddChild(node) }}>
                                <Plus className="size-3.5" />
                            </Button>
                        </IconTooltip>
                        <IconTooltip label={t("edit")}>
                            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); actions.onEdit(node) }}>
                                <Pencil className="size-3.5" />
                            </Button>
                        </IconTooltip>
                        <IconTooltip label={t("delete")}>
                            <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" onClick={(e) => { e.stopPropagation(); actions.onDelete(node) }}>
                                <Trash2 className="size-3.5" />
                            </Button>
                        </IconTooltip>
                    </div>
                )}
            </div>

            {isOpen && hasChildren && (
                <div>
                    {node.children.map((child) => (
                        <AccountTreeNodeRow
                            key={child.id}
                            node={child}
                            mode={mode}
                            expanded={expanded}
                            onToggle={onToggle}
                            selectedId={selectedId}
                            selectable={selectable}
                            onSelect={onSelect}
                            actions={actions}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
