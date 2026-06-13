"use client"

import { useTranslations } from "next-intl"
import { BrandsResource } from "../brands.resource"
import { BrandsForm } from "./brands-form"
import { createBrandsColumns } from "./brands-columns"

export function BrandsPage() {
    const t = useTranslations("business.resources.brands")
    return (
        <BrandsResource>
            <BrandsResource.Page
                title={t("title")}
                actions={
                    <BrandsResource.FormDialog
                        title={(it) => (it?.id ? String((it as unknown as { name?: unknown }).name ?? "") : t("addAction"))}
                        form={BrandsForm}
                    />
                }
            >
                <BrandsResource.Table columns={(helpers) => createBrandsColumns(helpers, t)} />
            </BrandsResource.Page>
        </BrandsResource>
    )
}
