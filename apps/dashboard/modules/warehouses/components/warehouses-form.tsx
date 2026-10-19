"use client"

import { useTranslations } from "next-intl"
import { type BranchesClient, type WarehousesClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfTextField, RhfLocalizedTextField, RhfResourceMultiSelect } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { warehousesFormConfig, type WarehouseFormValues, type WarehouseBranchField } from "../warehouses.config"

export function WarehousesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<WarehousesClient>) {
    const t = useTranslations("business.resources.warehouses")
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
                placeholder={t("codeAuto")}
                disabled={ctrl.isBusy || ctrl.isEditing}
            />
            <RhfLocalizedTextField
                name="name"
                label={t("name")}
                required
                disabled={ctrl.isBusy}
                placeholder={{ ar: t("namePlaceholderAr"), en: t("namePlaceholderEn") }}
            />
            <RhfResourceMultiSelect<WarehouseFormValues, "branches", BranchesClient, WarehouseBranchField>
                name="branches"
                label={t("branches")}
                placeholder={t("branchesPlaceholder")}
                description={t("branchesDescription")}
                required
                client={(api) => api.branches}
                getLabel={(item) => item.name}
                getValue={(item) => item}
                pageSize={50}
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
                    label={t("active")}
                    description={tf("activeDescription")}
                    disabled={ctrl.isBusy}
                />
            )}
        </ResourceFormShell>
    )
}
