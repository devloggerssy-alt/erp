"use client"

import { useTranslations } from "next-intl"
import { type WarehousesClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { warehousesFormConfig, type WarehouseFormValues } from "../warehouses.config"

export function WarehousesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<WarehousesClient>) {
    const t = useTranslations("system.forms.warehouses")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<WarehousesClient, WarehouseFormValues>({
        config: warehousesFormConfig,
        getClient: (api) => api.warehouses,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField
                name="code"
                label={t("code")}
                placeholder={t("codePlaceholder")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfTextField
                name="name"
                label={t("name")}
                placeholder={t("namePlaceholder")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfTextField
                name="address"
                label={t("address")}
                placeholder={t("addressPlaceholder")}
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
