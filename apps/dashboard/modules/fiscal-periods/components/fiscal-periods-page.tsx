"use client"

import { useTranslations } from "next-intl"
import { FiscalPeriodsResource } from "../fiscal-periods.resource"
import { FiscalPeriodsForm } from "./fiscal-periods-form"
import { createFiscalPeriodsColumns } from "./fiscal-periods-columns"

export function FiscalPeriodsPage() {
    const t = useTranslations("business.resources.fiscalPeriods")
    return (
        <FiscalPeriodsResource>
            <FiscalPeriodsResource.Page
                title={t("title")}
                actions={
                    <FiscalPeriodsResource.FormDialog
                        title={(it) => (it?.id ? it.name : t("addAction"))}
                        form={FiscalPeriodsForm}
                    />
                }
            >
                <FiscalPeriodsResource.Table columns={(helpers) => createFiscalPeriodsColumns(helpers, t)} />
            </FiscalPeriodsResource.Page>
        </FiscalPeriodsResource>
    )
}
