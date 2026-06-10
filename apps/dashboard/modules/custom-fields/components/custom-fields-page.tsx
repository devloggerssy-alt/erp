"use client"

import { useLocale, useTranslations } from "next-intl"
import { CustomFieldsResource } from "../custom-fields.resource"
import { CustomFieldsForm } from "./custom-fields-form"
import { createCustomFieldsColumns } from "./custom-fields-columns"

export function CustomFieldsPage() {
    const t = useTranslations("business.resources.customFields")
    const locale = useLocale()

    return (
        <CustomFieldsResource>
            <CustomFieldsResource.Page
                title={t("title")}
                description={t("description")}
                actions={
                    <CustomFieldsResource.FormDialog
                        title={(it) => (it?.id ? t("editAction") : t("addAction"))}
                        form={CustomFieldsForm}
                    />
                }
            >
                <CustomFieldsResource.Table
                    columns={(helpers) => createCustomFieldsColumns(helpers, t, locale)}
                />
            </CustomFieldsResource.Page>
        </CustomFieldsResource>
    )
}
