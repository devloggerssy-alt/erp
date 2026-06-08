"use client"

import { useTranslations } from "next-intl"
import { CurrenciesResource } from "../currencies.resource"
import { CurrenciesForm } from "./currencies-form"
import { createCurrenciesColumns } from "./currencies-columns"

export function CurrenciesPage() {
    const t = useTranslations("business.resources.currencies")
    return (
        <CurrenciesResource>
            <CurrenciesResource.Page
                title={t("title")}
                actions={
                    <CurrenciesResource.FormDialog
                        title={(it) => (it?.id ? it.code : t("addAction"))}
                        form={CurrenciesForm}
                    />
                }
            >
                <CurrenciesResource.Table columns={(helpers) => createCurrenciesColumns(helpers, t)} />
            </CurrenciesResource.Page>
        </CurrenciesResource>
    )
}
