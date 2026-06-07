"use client"

import { useTranslations } from "next-intl"
import { type UnitsClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { unitsFormConfig, type UnitFormValues } from "../units.config"

export function UnitsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<UnitsClient>) {
    const t = useTranslations("system.forms.units")
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
            <RhfTextField
                name="name"
                label={t("name")}
                placeholder={t("namePlaceholder")}
                required
                disabled={ctrl.isBusy}
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
                    label={tf("active")}
                    description={tf("activeDescription")}
                    disabled={ctrl.isBusy}
                />
            )}
        </ResourceFormShell>
    )
}
