"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { customFieldModules } from "@devloggers/api-contracts"
import { useCustomFieldDefinitions } from "@/shared/custom-fields"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { confirm } from "@/shared/components/confirm-dialog"
import { ItemsResource } from "../items.resource"
import { createItemsColumns } from "./items-columns"
import { ItemsImportExportActions } from "./items-import-export-actions"

function ItemsBulkDeleteButton() {
    const { selectedItems, deleteItem, clearSelection } = ItemsResource.useContext()
    const t = useTranslations("system.resource")

    const handleBulkDelete = async () => {
        const confirmed = await confirm({
            title: t("deleteTitle"),
            description: t("deleteDescription"),
            confirmLabel: t("deleteConfirm"),
            variant: "destructive",
        })
        if (!confirmed) return
        await Promise.all(selectedItems.map((item) => deleteItem(String(item.id))))
        clearSelection()
    }

    return (
        <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-8 gap-1.5">
            <Trash2 className="size-3.5" />
            {t("deleteConfirm")} ({selectedItems.length})
        </Button>
    )
}

export function ItemsPage() {
    const t = useTranslations("business.resources.items")
    const router = useRouter()
    const locale = useLocale()

    const localizedHref = (href: string) => (href === "/" ? `/${locale}` : `/${locale}${href}`)
    const { definitions: customFieldDefinitions } = useCustomFieldDefinitions(customFieldModules.items)

    return (
        <ItemsResource>
            <ItemsResource.Page
                title={t("title")}
                headerActions={() => <ItemsImportExportActions />}
                actions={
                    <Button size="lg" asChild>
                        <Link href={localizedHref("/catalog/items/new")}>
                            <Plus />
                            {t("addAction")}
                        </Link>
                    </Button>
                }
            >
                <ItemsResource.SelectionToolbar>
                    <ItemsBulkDeleteButton />
                </ItemsResource.SelectionToolbar>
                <ItemsResource.Table
                    enableRowSelection
                    columns={(helpers) =>
                        createItemsColumns(helpers, t, {
                            actions: {
                                onEdit: (row) => router.push(localizedHref(`/catalog/items/${row.id}/edit`)),
                            },
                            customFieldDefinitions,
                            locale,
                        })
                    }
                />
            </ItemsResource.Page>
        </ItemsResource>
    )
}