"use client"

import { useTranslations } from "next-intl"
import { SuppliersResource } from "../suppliers.resource"
import { SuppliersForm } from "./suppliers-form"
import { createPartiesColumns } from "@/modules/parties"

export function SuppliersPage() {
    const t = useTranslations("business.resources.suppliers")
    return (
        <SuppliersResource>
            <SuppliersResource.Page
                title={t("title")}
                actions={
                    <SuppliersResource.FormDialog
                        title={(it) => (it?.id ? it.name : t("addAction"))}
                        form={SuppliersForm}
                    />
                }
            >
                <SuppliersResource.Table columns={(helpers) => createPartiesColumns(helpers, t)} />
            </SuppliersResource.Page>
        </SuppliersResource>
    )
}
