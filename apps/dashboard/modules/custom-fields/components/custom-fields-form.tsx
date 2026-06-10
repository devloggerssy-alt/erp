"use client"

import { useTranslations } from "next-intl"
import { fieldTypes } from "@devloggers/api-contracts"
import { type CustomFieldsClient } from "@devloggers/api-client"
import {
    ResourceFormShell,
    RhfCheckboxField,
    RhfLocalizedTextField,
    RhfSelectField,
    RhfTextField,
} from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { customFieldsFormConfig, type CustomFieldFormValues } from "../custom-fields.config"

const TYPE_OPTIONS = Object.values(fieldTypes).map((value) => ({ value, label: value }))

export function CustomFieldsForm({
    resourceId,
    initialData,
    onSuccess,
    paramKey,
}: ResourceFormProps<CustomFieldsClient>) {
    const t = useTranslations("business.resources.customFields")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<CustomFieldsClient, CustomFieldFormValues>({
        config: customFieldsFormConfig,
        getClient: (api) => api["custom-fields"],
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    const showOptions = ctrl.form.watch("type") === fieldTypes.SELECT
        || ctrl.form.watch("type") === fieldTypes.MULTI_SELECT

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfLocalizedTextField name="name" label={t("name")} required disabled={ctrl.isBusy} />
            <RhfLocalizedTextField name="label" label={t("label")} required disabled={ctrl.isBusy} />
            <RhfSelectField
                name="type"
                label={t("type")}
                required
                disabled={ctrl.isBusy || ctrl.isEditing}
                options={TYPE_OPTIONS}
            />
            {showOptions && (
                <RhfTextField
                    name="optionsText"
                    label={t("options")}
                    placeholder={t("optionsPlaceholder")}
                    disabled={ctrl.isBusy}
                />
            )}
            <RhfTextField
                name="defaultValue"
                label={t("defaultValue")}
                placeholder={t("defaultValuePlaceholder")}
                disabled={ctrl.isBusy}
            />
            <RhfLocalizedTextField name="placeholder" label={t("placeholder")} disabled={ctrl.isBusy} />
            <RhfCheckboxField name="isRequired" label={t("required")} disabled={ctrl.isBusy} />
            <RhfCheckboxField
                name="showInList"
                label={t("showInList")}
                description={tf("activeDescription")}
                disabled={ctrl.isBusy}
            />
        </ResourceFormShell>
    )
}
