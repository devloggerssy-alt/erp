"use client"

import { useTranslations } from "next-intl"
import { TagsResource } from "../tags.resource"
import { TagsForm } from "./tags-form"
import { createTagsColumns } from "./tags-columns"

export function TagsPage() {
    const t = useTranslations("business.resources.tags")
    return (
        <TagsResource>
            <TagsResource.Page
                title={t("title")}
                actions={
                    <TagsResource.FormDialog
                        title={(it) => (it?.id ? (it.name as string) : t("addAction"))}
                        form={TagsForm}
                    />
                }
            >
                <TagsResource.Table columns={(helpers) => createTagsColumns(helpers, t)} />
            </TagsResource.Page>
        </TagsResource>
    )
}
