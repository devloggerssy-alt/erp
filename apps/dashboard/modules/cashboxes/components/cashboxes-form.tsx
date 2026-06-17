"use client"

import { useTranslations } from "next-intl"
import type { CashboxesClient, CurrenciesClient } from "@devloggers/api-client"
import {
    ResourceFormShell,
    RhfCheckboxField,
    RhfTextField,
    RhfLocalizedTextField,
    RhfResourceSelect,
} from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { cashboxesFormConfig, type CashboxFormValues, type CashboxRelationalField } from "../cashboxes.config"

export function CashboxesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<CashboxesClient>) {
    const t = useTranslations("business.resources.cashboxes")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<CashboxesClient, CashboxFormValues>({
        config: cashboxesFormConfig,
        getClient: (api) => api.cashboxes,
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
                disabled={ctrl.isBusy || ctrl.isEditing}
            />
            <RhfLocalizedTextField
                name="name"
                label={t("name")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfResourceSelect<CashboxFormValues, "currency", CurrenciesClient, CashboxRelationalField>
                name="currency"
                label={t("currency")}
                client={(api) => api.currencies}
                getLabel={(it) => `${(it as any).code} — ${(it as any).name}`}
                getValue={(it) => it}
                required
                disabled={ctrl.isBusy || ctrl.isEditing}
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
