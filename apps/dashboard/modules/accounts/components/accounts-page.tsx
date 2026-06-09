"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { BookOpen, Plus, Search, X } from "lucide-react"
import { confirm } from "@/shared/components/confirm-dialog"
import { Button } from "@/shared/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/shared/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/shared/components/ui/input-group"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ApiError } from "@devloggers/api-client"
import { AccountsResource } from "../accounts.resource"
import { useAccountsResource } from "../hooks"
import { useAccountDraftStore } from "../accounts-draft.store"
import { AccountsForm } from "./accounts-form"
import { AccountsTree } from "./accounts-tree"
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

function AccountsTreePanel() {
    const t = useTranslations("business.resources.accounts")
    const resource = useAccountsResource()
    const setDraft = useAccountDraftStore((s) => s.setDraft)
    const clearDraft = useAccountDraftStore((s) => s.clear)
    const [query, setQuery] = useState("")

    const items = ((resource.items ?? []) as unknown) as AccountListItem[]

    // Clear the add-child draft whenever the form dialog closes.
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
        resource.openEdit(resource.items.find((i) => String(i.id) === node.id)!)
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
        <div className="space-y-4">
            <InputGroup className="max-w-sm">
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
                        <InputGroupButton onClick={() => setQuery("")} aria-label={t("clear")}>
                            <X className="size-3.5" />
                        </InputGroupButton>
                    </InputGroupAddon>
                )}
            </InputGroup>
            <div className="rounded-lg border bg-card p-4">
                {resource.isLoading ? (
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
                        items={items}
                        query={query}
                        mode="manage"
                        actions={{ onAddChild, onEdit, onDelete }}
                    />
                )}
            </div>
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
    return (
        <AccountsResource>
            <AccountsResource.Page
                title={t("title")}
                toolbar={<AccountsResource.Toolbar>{null}</AccountsResource.Toolbar>}
                actions={
                    <div className="flex items-center gap-2">
                        <AccountsResource.FormDialog
                            title={(it) => (it?.id ? t("editTitle") : t("addAction"))}
                            form={AccountsForm}
                        />
                    </div>
                }
            >
                <AccountsTreePanel />
            </AccountsResource.Page>
        </AccountsResource>
    )
}
