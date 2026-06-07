"use client"

import { useTranslations } from "next-intl"
import { UnitsResource } from "../units.resource"
import { UnitsForm } from "./units-form"
import { createUnitsColumns } from "./units-columns"

export function UnitsPage() {
    const t = useTranslations("business.resources.units")
    return (
        <UnitsResource>
            <UnitsResource.Page
                title={t("title")}
                actions={
                    <UnitsResource.FormDialog
                        title={(it) => (it?.id ? it.name : t("addAction"))}
                        form={UnitsForm}
                    />
                }
            >
                <UnitsResource.Table columns={(helpers) => createUnitsColumns(helpers, t)} />
            </UnitsResource.Page>
        </UnitsResource>
    )
}
