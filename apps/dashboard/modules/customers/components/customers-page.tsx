"use client"

import { useTranslations } from "next-intl"
import { CustomersResource } from "../customers.resource"
import { CustomersForm } from "./customers-form"
import { createPartiesColumns } from "@/modules/parties"

export function CustomersPage() {
    const t = useTranslations("business.resources.customers")
    return (
        <CustomersResource>
            <CustomersResource.Page
                title={t("title")}
                actions={
                    <CustomersResource.FormDialog
                        title={(it) => (it?.id ? it.name : t("addAction"))}
                        form={CustomersForm}
                    />
                }
            >
                <CustomersResource.Table columns={(helpers) => createPartiesColumns(helpers, t)} />
            </CustomersResource.Page>
        </CustomersResource>
    )
}
