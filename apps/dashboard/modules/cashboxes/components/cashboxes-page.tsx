"use client"

import { useTranslations } from "next-intl"
import { CashboxesResource } from "../cashboxes.resource"
import { createCashboxesColumns } from "./cashboxes-columns"
import { CashboxesForm } from "./cashboxes-form"

export function CashboxesPage() {
    const t = useTranslations("business.resources.cashboxes")

    return (
        <CashboxesResource>
            <CashboxesResource.Page
                title={t("title")}
                actions={
                    <CashboxesResource.FormDialog
                        title={(it) => (it?.id ? it.name ?? t("entity") : t("addAction"))}
                        form={CashboxesForm}
                    />
                }
            >
                <CashboxesResource.Table columns={createCashboxesColumns} />
            </CashboxesResource.Page>
        </CashboxesResource>
    )
}
