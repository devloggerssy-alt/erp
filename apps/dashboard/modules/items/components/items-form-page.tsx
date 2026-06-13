"use client"

import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Package } from "lucide-react"
import { DashboardDetailsPage } from "@/infrastructure/components/layout/dashboard"
import { ItemsForm } from "./items-form"

type ItemsFormPageProps = {
    resourceId?: string
}

export function ItemsFormPage({ resourceId }: ItemsFormPageProps) {
    const t = useTranslations("business.resources.items")
    const router = useRouter()
    const locale = useLocale()
    const isEditing = !!resourceId

    const localizedHref = (href: string) => (href === "/" ? `/${locale}` : `/${locale}${href}`)
    const listHref = "/catalog/items"

    return (
        <DashboardDetailsPage
            title={isEditing ? t("editTitle") : t("createTitle")}
            description={isEditing ? t("editDescription") : t("createDescription")}
            icon={<Package className="size-[18px]" />}
            backHref={listHref}
        >
            <ItemsForm
                resourceId={resourceId ?? null}
                initialData={null}
                closeOnSuccess={false}
                onSuccess={() => router.push(localizedHref(listHref))}
            />
        </DashboardDetailsPage>
    )
}

export function ItemsCreatePage() {
    return <ItemsFormPage />
}

export function ItemsEditPage({ itemId }: { itemId: string }) {
    return <ItemsFormPage resourceId={itemId} />
}
