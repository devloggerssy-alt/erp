"use client"

import { useTranslations } from "next-intl"
import { WarehousesResource } from "../warehouses.resource"
import { WarehousesForm } from "./warehouses-form"
import { createWarehousesColumns } from "./warehouses-columns"

export function WarehousesPage() {
    const t = useTranslations("business.resources.warehouses")
    return (
        <WarehousesResource>
            <WarehousesResource.Page
                title={t("title")}
                actions={
                    <WarehousesResource.FormDialog
                        title={(it) => (it?.id ? it.name : t("addAction"))}
                        form={WarehousesForm}
                    />
                }
            >
                <WarehousesResource.Table columns={(helpers) => createWarehousesColumns(helpers, t)} />
            </WarehousesResource.Page>
        </WarehousesResource>
    )
}
