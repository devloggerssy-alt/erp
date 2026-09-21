"use client"

import { useTranslations } from "next-intl"
import type { CatalogEntitiesClient } from "@devloggers/api-client"
import { catalogEntityResource } from "@devloggers/api-contracts"
import { ResourceFormShell, RhfCheckboxField, RhfResourceSelect, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { catalogEntitiesFormConfig, type CatalogEntityFormValues } from "../catalog-entities.config"

export function CatalogEntitiesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<CatalogEntitiesClient>) {
    const t = useTranslations("business.resources.catalogEntities")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<CatalogEntitiesClient, CatalogEntityFormValues>({
        config: catalogEntitiesFormConfig,
        getClient: (api) => api[catalogEntityResource.key],
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
                client={(api) => api[catalogEntityResource.key]}
                getLabel={(item) => `${item.name} (${item.kind})`}
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
