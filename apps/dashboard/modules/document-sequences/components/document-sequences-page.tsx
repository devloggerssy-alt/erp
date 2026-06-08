"use client"

import { useTranslations } from "next-intl"
import { DocumentSequencesResource } from "../document-sequences.resource"
import { DocumentSequencesForm } from "./document-sequences-form"
import { createDocumentSequencesColumns } from "./document-sequences-columns"

export function DocumentSequencesPage() {
    const t = useTranslations("business.resources.documentSequences")
    return (
        <DocumentSequencesResource>
            <DocumentSequencesResource.Page
                title={t("title")}
                actions={
                    <DocumentSequencesResource.FormDialog
                        title={(it) => (it?.id ? it.documentType : t("addAction"))}
                        form={DocumentSequencesForm}
                    />
                }
            >
                <DocumentSequencesResource.Table columns={(helpers) => createDocumentSequencesColumns(helpers, t)} />
            </DocumentSequencesResource.Page>
        </DocumentSequencesResource>
    )
}
