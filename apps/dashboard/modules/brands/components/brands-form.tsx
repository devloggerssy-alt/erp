"use client"

import { useTranslations } from "next-intl"
import { type ICrudClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { brandsFormConfig, type BrandFormValues } from "../brands.config"

export function BrandsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<ICrudClient>) {
    const t = useTranslations("business.resources.brands")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<ICrudClient, BrandFormValues>({
        config: brandsFormConfig,
        getClient: (api) => api.brands as ICrudClient,
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
                name="imageUrl"
                label={t("imageUrl")}
                placeholder={t("imageUrlPlaceholder")}
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
