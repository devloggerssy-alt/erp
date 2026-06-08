"use client"

import { useTranslations } from "next-intl"
import { RolesResource } from "../roles.resource"
import { RolesForm } from "./roles-form"
import { createRolesColumns } from "./roles-columns"

export function RolesPage() {
    const t = useTranslations("business.resources.roles")
    return (
        <RolesResource>
            <RolesResource.Page
                title={t("title")}
                actions={
                    <RolesResource.FormDialog
                        title={(it) => (it?.id ? it.name : t("addAction"))}
                        form={RolesForm}
                    />
                }
            >
                <RolesResource.Table columns={(helpers) => createRolesColumns(helpers, t)} />
            </RolesResource.Page>
        </RolesResource>
    )
}
