"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { confirm } from "@/shared/components/confirm-dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ApiError } from "@devloggers/api-client"
import { AccountsResource } from "../accounts.resource"
import { useAccountsResource } from "../hooks"
import { useAccountDraftStore } from "../accounts-draft.store"
import { AccountsForm } from "./accounts-form"
import { AccountsTree } from "./accounts-tree"
import type { AccountListItem, AccountTreeNode } from "../accounts.types"

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
        <div className="space-y-3">
            <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="max-w-sm"
            />
            <div className="rounded-lg border bg-card p-3">
                {resource.isLoading ? (
                    <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-3 py-12 text-center">
                        <p className="text-sm text-muted-foreground">{t("empty")}</p>
                        <AddRootButton />
                    </div>
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
                        <AddRootButton />
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
