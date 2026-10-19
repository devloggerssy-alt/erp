"use client"

import { useTranslations } from "next-intl"
import { BranchesResource } from "../branches.resource"
import { BranchesForm } from "./branches-form"
import { createBranchesColumns } from "./branches-columns"

export function BranchesPage() {
    const t = useTranslations("business.resources.branches")
    return (
        <BranchesResource>
            <BranchesResource.Page
                title={t("title")}
                actions={
                    <BranchesResource.FormDialog
                        title={(it) => (it?.id ? it.name : t("addAction"))}
                        form={BranchesForm}
                    />
                }
            >
                <BranchesResource.Table columns={(helpers) => createBranchesColumns(helpers, t)} />
            </BranchesResource.Page>
        </BranchesResource>
    )
}
