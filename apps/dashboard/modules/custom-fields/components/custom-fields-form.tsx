"use client"

import { useTranslations } from "next-intl"
import { useFieldArray } from "react-hook-form"
import { Plus, X } from "lucide-react"
import { fieldTypes } from "@devloggers/api-contracts"
import { type CustomFieldsClient } from "@devloggers/api-client"
import {
    ResourceFormShell,
    RhfCheckboxField,
    RhfLocalizedTextField,
    RhfSelectField,
    RhfTextField,
} from "@/shared/components/form"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
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

    const { fields, append, remove } = useFieldArray({
        control: ctrl.form.control,
        name: "options",
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
                <div className="flex flex-col gap-2">
                    <Label>{t("options")}</Label>
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                            <Input
                                {...ctrl.form.register(`options.${index}.value`)}
                                disabled={ctrl.isBusy}
                                placeholder={`${t("options")} ${index + 1}`}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={ctrl.isBusy}
                                onClick={() => remove(index)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={ctrl.isBusy}
                        onClick={() => append({ value: "" })}
                        className="w-fit"
                    >
                        <Plus className="me-1 h-4 w-4" />
                        {t("addOption")}
                    </Button>
                </div>
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
