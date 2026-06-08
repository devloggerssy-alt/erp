"use client"

import { useTranslations } from "next-intl"
import { type CurrenciesClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfTextField, RhfLocalizedTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { currenciesFormConfig, type CurrencyFormValues } from "../currencies.config"

export function CurrenciesForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<CurrenciesClient>) {
    const t = useTranslations("business.resources.currencies")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<CurrenciesClient, CurrencyFormValues>({
        config: currenciesFormConfig,
        getClient: (api) => api.currencies,
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
            <RhfLocalizedTextField
                name="name"
                label={t("name")}
                required
                disabled={ctrl.isBusy}
                placeholder={{ ar: t("namePlaceholderAr"), en: t("namePlaceholderEn") }}
            />
            <RhfLocalizedTextField
                name="symbol"
                label={t("symbol")}
                disabled={ctrl.isBusy}
                placeholder={{ ar: t("symbolPlaceholderAr"), en: t("symbolPlaceholderEn") }}
            />
            <RhfCheckboxField
                name="isBase"
                label={t("isBase")}
                description={t("isBaseDescription")}
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
