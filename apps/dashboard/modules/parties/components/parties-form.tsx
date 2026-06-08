"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { type PartiesClient } from "@devloggers/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfSelectField, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import {
    partiesFormConfig,
    DEFAULT_PARTY_FORM_VALUES,
    PARTY_TYPES,
    PARTY_MODE_NAMESPACE,
    type PartyFormValues,
    type PartyMode,
} from "../parties.config"

export type PartiesFormProps = ResourceFormProps<PartiesClient> & {
    /** Scopes the form to a customer- or supplier-facing view: drives i18n strings and the `type` seeded on create. */
    mode: PartyMode
}

export function PartiesForm({ resourceId, initialData, onSuccess, paramKey, mode }: PartiesFormProps) {
    const t = useTranslations(PARTY_MODE_NAMESPACE[mode])
    const tf = useTranslations("system.resourceForm")

    const formConfig = useMemo(
        () => ({
            ...partiesFormConfig,
            defaultValues: { ...DEFAULT_PARTY_FORM_VALUES, type: mode },
        }),
        [mode],
    )

    const ctrl = useResourceFormController<PartiesClient, PartyFormValues>({
        config: formConfig,
        getClient: (api) => api.parties,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    const typeOptions = PARTY_TYPES.map((value) => ({
        value,
        label: t(`type_${value}`),
    }))

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField
                name="code"
                label={t("code")}
                placeholder={t("codePlaceholder")}
                disabled={ctrl.isBusy}
            />
            <RhfTextField
                name="name"
                label={t("name")}
                placeholder={t("namePlaceholder")}
                required
                disabled={ctrl.isBusy}
            />
            <RhfSelectField
                name="type"
                label={t("type")}
                placeholder={t("typePlaceholder")}
                required
                options={typeOptions}
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
            <RhfTextField
                name="address"
                label={t("address")}
                placeholder={t("addressPlaceholder")}
                disabled={ctrl.isBusy}
            />
            <RhfTextField
                name="openingBalance"
                label={t("openingBalance")}
                placeholder={t("openingBalancePlaceholder")}
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
