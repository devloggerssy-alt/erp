"use client"

import { useWatch } from "react-hook-form"
import { useTranslations } from "next-intl"
import { type BranchesClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfTextField, RhfLocalizedTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { branchesFormConfig, type BranchFormValues } from "../branches.config"

export function BranchesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<BranchesClient>) {
    const t = useTranslations("business.resources.branches")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<BranchesClient, BranchFormValues>({
        config: branchesFormConfig,
        getClient: (api) => api.branches,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    const warehouses = useWatch({ control: ctrl.form.control, name: "warehouses" }) ?? []

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
            <RhfTextField
                name="address"
                label={t("address")}
                placeholder={t("addressPlaceholder")}
                disabled={ctrl.isBusy}
            />
            <RhfTextField
                name="phone"
                label={t("phone")}
                placeholder={t("phonePlaceholder")}
                disabled={ctrl.isBusy}
            />
            <RhfTextField
                name="email"
                label={t("email")}
                placeholder={t("emailPlaceholder")}
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
            {ctrl.isEditing && (
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{t("warehouses")}</span>
                    {warehouses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noWarehouses")}</p>
                    ) : (
                        <ul className="flex flex-col gap-1 rounded-md border p-3 text-sm">
                            {warehouses.map((warehouse) => (
                                <li key={warehouse.id} className="flex items-center justify-between gap-2">
                                    <span>{warehouse.name}</span>
                                    <span className="text-muted-foreground">{warehouse.code}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs text-muted-foreground">{t("warehousesHint")}</p>
                </div>
            )}
        </ResourceFormShell>
    )
}
