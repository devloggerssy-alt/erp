"use client"

import { useTranslations } from "next-intl"
import { CatalogEntitiesResource } from "../catalog-entities.resource"
import { CatalogEntitiesForm } from "./catalog-entities-form"
import { createCatalogEntitiesColumns } from "./catalog-entities-columns"

export function CatalogEntitiesPage() {
    const t = useTranslations("business.resources.catalogEntities")
    return (
        <CatalogEntitiesResource>
            <CatalogEntitiesResource.Page
                title={t("title")}
                actions={
                    <CatalogEntitiesResource.FormDialog
                        title={(it) => (it?.id ? (it as unknown as { name: string }).name : t("addAction"))}
                        form={CatalogEntitiesForm}
                    />
                }
            >
                <CatalogEntitiesResource.Table
                    columns={(helpers) => createCatalogEntitiesColumns(helpers, t)}
                />
            </CatalogEntitiesResource.Page>
        </CatalogEntitiesResource>
    )
}
