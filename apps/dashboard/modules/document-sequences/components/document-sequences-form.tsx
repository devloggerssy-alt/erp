"use client"

import { useTranslations } from "next-intl"
import { type DocumentSequencesClient } from "@devloggers/api-client"
import { documentSequenceResource } from "@devloggers/api-contracts"
import { ResourceFormShell, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { documentSequencesFormConfig, type DocumentSequenceFormValues } from "../document-sequences.config"

export function DocumentSequencesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<DocumentSequencesClient>) {
    const t = useTranslations("business.resources.documentSequences")

    const ctrl = useResourceFormController<DocumentSequencesClient, DocumentSequenceFormValues>({
        config: documentSequencesFormConfig,
        getClient: (api) => api[documentSequenceResource.key],
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField
                name="documentType"
                label={t("documentType")}
                placeholder={t("documentTypePlaceholder")}
                required
                disabled={ctrl.isBusy || ctrl.isEditing}
            />
            <RhfTextField
                name="prefix"
                label={t("prefix")}
                placeholder={t("prefixPlaceholder")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfTextField
                name="nextNumber"
                label={t("nextNumber")}
                placeholder={t("nextNumberPlaceholder")}
                required
                disabled={ctrl.isBusy}
                type="number"
            />
            <RhfTextField
                name="padding"
                label={t("padding")}
                placeholder={t("paddingPlaceholder")}
                required
                disabled={ctrl.isBusy}
                type="number"
            />
        </ResourceFormShell>
    )
}
