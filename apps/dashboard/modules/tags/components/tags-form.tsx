"use client"

import { useTranslations } from "next-intl"
import { type TagsClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfSelectField, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { tagsFormConfig, TAG_MODULES, type TagFormValues } from "../tags.config"

export function TagsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<TagsClient>) {
    const t = useTranslations("business.resources.tags")

    const ctrl = useResourceFormController<TagsClient, TagFormValues>({
        config: tagsFormConfig,
        getClient: (api) => api.tags,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField
                name="name"
                label={t("name")}
                placeholder={t("namePlaceholder")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfTextField
                name="color"
                label={t("color")}
                placeholder={t("colorPlaceholder")}
                disabled={ctrl.isBusy}
            />
            <RhfSelectField
                name="module"
                label={t("module")}
                placeholder={t("modulePlaceholder")}
                options={TAG_MODULES.map((m) => ({
                    label: t(`modules.${m}`),
                    value: m,
                }))}
                disabled={ctrl.isBusy || ctrl.isEditing}
            />
        </ResourceFormShell>
    )
}
