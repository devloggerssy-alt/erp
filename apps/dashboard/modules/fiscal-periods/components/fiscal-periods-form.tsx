"use client"

import { useTranslations } from "next-intl"
import { type FiscalPeriodsClient } from "@devloggers/api-client"
import { fiscalPeriodResource } from "@devloggers/api-contracts"
import { ResourceFormShell, RhfTextField, RhfSelectField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { fiscalPeriodsFormConfig, type FiscalPeriodFormValues } from "../fiscal-periods.config"

export function FiscalPeriodsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<FiscalPeriodsClient>) {
    const t = useTranslations("business.resources.fiscalPeriods")

    const ctrl = useResourceFormController<FiscalPeriodsClient, FiscalPeriodFormValues>({
        config: fiscalPeriodsFormConfig,
        getClient: (api) => api[fiscalPeriodResource.key],
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
                name="startDate"
                label={t("startDate")}
                required
                disabled={ctrl.isBusy}
                type="date"
            />
            <RhfTextField
                name="endDate"
                label={t("endDate")}
                required
                disabled={ctrl.isBusy}
                type="date"
            />
            {ctrl.isEditing && (
                <RhfSelectField
                    name="status"
                    label={t("status")}
                    disabled={ctrl.isBusy}
                    options={[
                        { value: "OPEN", label: t("status_OPEN") },
                        { value: "CLOSED", label: t("status_CLOSED") },
                        { value: "LOCKED", label: t("status_LOCKED") },
                    ]}
                />
            )}
        </ResourceFormShell>
    )
}
