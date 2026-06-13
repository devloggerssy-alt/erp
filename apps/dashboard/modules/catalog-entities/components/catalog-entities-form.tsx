"use client"

import { useTranslations } from "next-intl"
import type { ICrudClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfResourceSelect, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { catalogEntitiesFormConfig, type CatalogEntityFormValues } from "../catalog-entities.config"

export function CatalogEntitiesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<ICrudClient>) {
    const t = useTranslations("business.resources.catalogEntities")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<ICrudClient, CatalogEntityFormValues>({
        config: catalogEntitiesFormConfig,
        getClient: (api) => api["catalog-entities"] as ICrudClient,
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
                name="kind"
                label={t("kind")}
                placeholder={t("kindPlaceholder")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfResourceSelect
                name="parent"
                label={t("parent")}
                placeholder={t("parentPlaceholder")}
                client={(api) => api["catalog-entities"] as ICrudClient}
                getLabel={(item) => {
                    const e = item as unknown as { name: string; kind: string }
                    return `${e.name} (${e.kind})`
                }}
                getValue={(item) => item}
                pageSize={20}
                disabled={ctrl.isBusy}
            />
            {ctrl.isEditing && (
                <RhfCheckboxField
                    name="isActive"
                    label={t("active")}
                    description={tf("activeDescription")}
                    disabled={ctrl.isBusy}
                />
            )}
        </ResourceFormShell>
    )
}
