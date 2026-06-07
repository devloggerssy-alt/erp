"use client"

import { CategoriesResource } from "../categories.resource"
import { CategoriesForm } from "./categories-form"
import { createCategoriesColumns } from "./categories-columns"
import { useTranslations } from "next-intl"

export function CategoriesPage() {
    const t = useTranslations("business.resources.categories")
    return (
        <CategoriesResource>
            <CategoriesResource.Page
                title={t("title")}
                actions={
                    <CategoriesResource.FormDialog
                        title={(it) => (it?.id ? it.name : t("addAction"))}
                        form={CategoriesForm}
                    />
                }
            >
                <CategoriesResource.Table columns={(helpers) => createCategoriesColumns(helpers, t)} />
            </CategoriesResource.Page>
        </CategoriesResource>
    )
}
