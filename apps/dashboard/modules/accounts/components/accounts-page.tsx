"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { BookOpen, ChevronsDownUp, ChevronsUpDown, Plus, Search, X } from "lucide-react"
import { confirm } from "@/shared/components/confirm-dialog"
import { Button } from "@/shared/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/shared/components/ui/empty"
import { IconTooltip } from "@/shared/components/icon-tooltip"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/shared/components/ui/input-group"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ApiError } from "@devloggers/api-client"
import { AccountsResource } from "../accounts.resource"
import { useAccountsResource, useAccountBalances, useAccountTree, ACCOUNT_BALANCES_KEY, ACCOUNT_TREE_KEY } from "../hooks"
import { useAccountDraftStore } from "../accounts-draft.store"
import { AccountsForm } from "./accounts-form"
import { AccountsTree, type AccountsTreeHandle } from "./accounts-tree"
import { AccountBalancesPanel } from "./account-balances-panel"
import type { AccountListItem, AccountTreeNode } from "../accounts.types"

function TreeSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <div className="mb-2 flex items-center gap-2 px-1">
                    <Skeleton className="size-4 rounded" />
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-4 w-6 rounded-full" />
                </div>
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-[calc(100%-1.25rem)] rounded-md ms-5" />
                <Skeleton className="h-8 w-[calc(100%-2.5rem)] rounded-md ms-10" />
                <Skeleton className="h-8 w-full rounded-md" />
            </div>
            <div className="space-y-1">
                <div className="mb-2 flex items-center gap-2 px-1">
                    <Skeleton className="size-4 rounded" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-6 rounded-full" />
                </div>
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-[calc(100%-1.25rem)] rounded-md ms-5" />
            </div>
        </div>
    )
}

function AccountsTreePanel({
    query,
    treeRef,
    items,
    isLoading,
    selectedId,
    onSelect,
}: {
    query: string
    treeRef: React.RefObject<AccountsTreeHandle | null>
    items: AccountListItem[]
    isLoading: boolean
    selectedId: string | null
    onSelect: (id: string | null) => void
}) {
    const t = useTranslations("business.resources.accounts")
    const resource = useAccountsResource()
    const queryClient = useQueryClient()
    const setDraft = useAccountDraftStore((s) => s.setDraft)
    const clearDraft = useAccountDraftStore((s) => s.clear)

    useEffect(() => {
        if (!resource.isDialogOpen) clearDraft()
    }, [resource.isDialogOpen, clearDraft])

    const onAddChild = (node: AccountTreeNode) => {
        setDraft({
            parent: { id: node.id, code: node.account.code, name: node.label },
            type: node.account.type,
        })
        resource.openCreate()
    }

    const onEdit = (node: AccountTreeNode) => {
        const raw = resource.items.find((i) => String(i.id) === node.id)
        if (raw) resource.openEdit(raw)
    }

    const onDelete = async (node: AccountTreeNode) => {
        const confirmed = await confirm({
            title: t("deleteTitle"),
            description: t("deleteDescription", { name: node.label }),
            confirmLabel: t("delete"),
            variant: "destructive",
        })
        if (!confirmed) return
        try {
            await resource.deleteItem(node.id)
            queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY })
            queryClient.invalidateQueries({ queryKey: ACCOUNT_TREE_KEY })
        } catch (err) {
            const message = err instanceof ApiError ? err.message : t("deleteFailed")
            await confirm({
                title: t("deleteFailed"),
                description: message,
                confirmLabel: t("ok"),
            })
        }
    }

    return (
        <div className="rounded-lg border bg-card p-3">
            {isLoading ? (
                <TreeSkeleton />
            ) : items.length === 0 ? (
                <Empty className="border-0 py-10">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BookOpen />
                        </EmptyMedia>
                        <EmptyDescription>{t("empty")}</EmptyDescription>
                    </EmptyHeader>
                    <AddRootButton />
                </Empty>
            ) : (
                <AccountsTree
                    ref={treeRef}
                    items={items}
                    query={query}
                    mode="manage"
                    selectedId={selectedId}
                    onSelect={(node) => onSelect(node.id)}
                    actions={{ onAddChild, onEdit, onDelete }}
                />
            )}
        </div>
    )
}

function AddRootButton() {
    const t = useTranslations("business.resources.accounts")
    const resource = useAccountsResource()
    const clear = useAccountDraftStore((s) => s.clear)
    return (
        <Button
            type="button"
            onClick={() => { clear(); resource.openCreate() }}
        >
            <Plus className="size-4" />
            {t("addAction")}
        </Button>
    )
}

export function AccountsPage() {
    const t = useTranslations("business.resources.accounts")
    const [query, setQuery] = useState("")
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const treeRef = useRef<AccountsTreeHandle>(null)
    const { data: treeItems = [], isLoading: treeLoading } = useAccountTree()
    const { data: balanceItems = [] } = useAccountBalances()

    return (
        <AccountsResource>
            <AccountsResource.Page
                title={t("title")}
                toolbar={
                    <AccountsResource.Toolbar>
                        <AccountsResource.Toolbar.Start>
                            <div className="flex items-center gap-1">
                                <IconTooltip label={t("expandAll")}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => treeRef.current?.expandAll()}
                                    >
                                        <ChevronsUpDown className="size-4" />
                                    </Button>
                                </IconTooltip>
                                <IconTooltip label={t("collapseAll")}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => treeRef.current?.collapseAll()}
                                    >
                                        <ChevronsDownUp className="size-4" />
                                    </Button>
                                </IconTooltip>
                            </div>
                        </AccountsResource.Toolbar.Start>
                        <AccountsResource.Toolbar.Center>
                            <InputGroup>
                                <InputGroupAddon>
                                    <Search className="size-4" />
                                </InputGroupAddon>
                                <InputGroupInput
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t("searchPlaceholder")}
                                />
                                {query && (
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton
                                            onClick={() => setQuery("")}
                                            aria-label={t("clear")}
                                        >
                                            <X className="size-3.5" />
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                )}
                            </InputGroup>
                        </AccountsResource.Toolbar.Center>
                    </AccountsResource.Toolbar>
                }
                actions={
                    <AccountsResource.FormDialog
                        title={(it) => (it?.id ? t("editTitle") : t("addAction"))}
                        form={AccountsForm}
                    />
                }
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
                    <AccountsTreePanel
                        query={query}
                        treeRef={treeRef}
                        items={treeItems}
                        isLoading={treeLoading}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                    />
                    <AccountBalancesPanel
                        items={balanceItems}
                        selectedId={selectedId}
                        onSelectAccount={setSelectedId}
                    />
                </div>
            </AccountsResource.Page>
        </AccountsResource>
    )
}
