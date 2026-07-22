"use client"

import { useTranslations } from "next-intl"
import { type UnitsClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfTextField, RhfLocalizedTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { unitsFormConfig, type UnitFormValues } from "../units.config"

export function UnitsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<UnitsClient>) {
    const t = useTranslations("business.resources.units")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<UnitsClient, UnitFormValues>({
        config: unitsFormConfig,
        getClient: (api) => api.units,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfLocalizedTextField
                name="name"
                label={t("name")}
                required
                disabled={ctrl.isBusy}
                placeholder={{ ar: t("namePlaceholderAr"), en: t("namePlaceholderEn") }}
            />
            <RhfTextField
                name="abbreviation"
                label={t("abbreviation")}
                placeholder={t("abbreviationPlaceholder")}
                required
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
