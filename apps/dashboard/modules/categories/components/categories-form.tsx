"use client"

import { useTranslations } from "next-intl"
import { type CategoriesClient } from "@devloggers/api-client"
import { itemCategoryResource } from "@devloggers/api-contracts"
import { ResourceFormShell, RhfCheckboxField, RhfResourceSelect, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { categoriesFormConfig, type CategoryFormValues } from "../categories.config"

export function CategoriesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<CategoriesClient>) {
    const t = useTranslations("system.forms.categories")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<CategoriesClient, CategoryFormValues>({
        config: categoriesFormConfig,
        getClient: (api) => api[itemCategoryResource.key],
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
                name="description"
                label={t("description")}
                placeholder={t("descriptionPlaceholder")}
                disabled={ctrl.isBusy}
            />
            <RhfResourceSelect
                name="parent"
                label={t("parent")}
                placeholder={t("parentPlaceholder")}
                client={(api) => api[itemCategoryResource.key]}
                getLabel={(item) => item.name}
                getValue={(item) => item}
                pageSize={20}
                disabled={ctrl.isBusy}
            />
            {ctrl.isEditing && (
                <RhfCheckboxField
                    name="isActive"
                    label={tf("active")}
                    description={tf("activeDescription")}
                    disabled={ctrl.isBusy}
                />
            )}
        </ResourceFormShell>
    )
}
