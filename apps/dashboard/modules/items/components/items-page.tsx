"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { customFieldModules } from "@devloggers/api-contracts"
import { useCustomFieldDefinitions } from "@/shared/custom-fields"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ItemsResource } from "../items.resource"
import { createItemsColumns } from "./items-columns"

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
                actions={
                    <Button size="lg" asChild>
                        <Link href={localizedHref("/catalog/items/new")}>
                            <Plus />
                            {t("addAction")}
                        </Link>
                    </Button>
                }
            >
                <ItemsResource.Table
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