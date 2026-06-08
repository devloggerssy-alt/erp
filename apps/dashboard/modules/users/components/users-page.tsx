"use client"

import { useTranslations } from "next-intl"
import { UsersResource } from "../users.resource"
import { UsersForm } from "./users-form"
import { createUsersColumns } from "./users-columns"

export function UsersPage() {
    const t = useTranslations("business.resources.users")
    return (
        <UsersResource>
            <UsersResource.Page
                title={t("title")}
                actions={
                    <UsersResource.FormDialog
                        title={(it) => (it?.id ? it.fullName : t("addAction"))}
                        form={UsersForm}
                    />
                }
            >
                <UsersResource.Table columns={(helpers) => createUsersColumns(helpers, t)} />
            </UsersResource.Page>
        </UsersResource>
    )
}
