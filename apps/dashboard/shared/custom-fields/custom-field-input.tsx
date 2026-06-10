"use client"

import { useLocale, useTranslations } from "next-intl"
import { useController, useFormContext } from "react-hook-form"
import type { CustomFieldResponseDto } from "@devloggers/api-contracts"
import { fieldTypes } from "@devloggers/api-contracts"
import { localize } from "@/shared/lib/localize"
import {
    RhfCheckboxField,
    RhfSelectField,
    RhfTextField,
} from "@/shared/components/form"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { FieldShell } from "@/shared/components/form/field-shell"
type CustomFieldInputProps = {
    field: CustomFieldResponseDto
    namePrefix?: string
    disabled?: boolean
}

export function CustomFieldInput({
    field,
    namePrefix = "customFields",
    disabled = false,
}: CustomFieldInputProps) {
    const locale = useLocale()
    const label = localize(field.label, locale, localize(field.name, locale))
    const placeholder = localize(field.placeholder, locale)
    const fieldName = `${namePrefix}.${field.id}`

    switch (field.type) {
        case fieldTypes.BOOLEAN:
            return (
                <RhfCheckboxField
                    name={fieldName}
                    label={label}
                    required={field.isRequired}
                    disabled={disabled}
                />
            )
        case fieldTypes.NUMBER:
            return (
                <RhfTextField
                    name={fieldName}
                    label={label}
                    placeholder={placeholder}
                    type="number"
                    required={field.isRequired}
                    disabled={disabled}
                />
            )
        case fieldTypes.DATE:
            return (
                <RhfTextField
                    name={fieldName}
                    label={label}
                    placeholder={placeholder}
                    type="date"
                    required={field.isRequired}
                    disabled={disabled}
                />
            )
        case fieldTypes.SELECT:
            return (
                <RhfSelectField
                    name={fieldName}
                    label={label}
                    placeholder={placeholder || label}
                    required={field.isRequired}
                    disabled={disabled}
                    options={field.options.map((option) => ({ value: option, label: option }))}
                />
            )
        case fieldTypes.MULTI_SELECT:
            return (
                <MultiSelectField
                    name={fieldName}
                    label={label}
                    options={field.options}
                    required={field.isRequired}
                    disabled={disabled}
                />
            )
        default:
            return (
                <RhfTextField
                    name={fieldName}
                    label={label}
                    placeholder={placeholder}
                    required={field.isRequired}
                    disabled={disabled}
                />
            )
    }
}

function MultiSelectField({
    name,
    label,
    options,
    required,
    disabled,
}: {
    name: string
    label: string
    options: string[]
    required?: boolean
    disabled?: boolean
}) {
    const t = useTranslations("system.customFields")
    const { control } = useFormContext()
    const { field, fieldState } = useController({ name, control, disabled })

    const selected = Array.isArray(field.value) ? (field.value as string[]) : []

    const toggle = (option: string, checked: boolean) => {
        const next = checked
            ? [...selected, option]
            : selected.filter((value) => value !== option)
        field.onChange(next)
    }

    return (
        <FieldShell label={label} error={fieldState.error?.message} required={required}>
            <div className="flex flex-wrap gap-3 rounded-md border p-3">
                {options.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={selected.includes(option)}
                            disabled={disabled}
                            onCheckedChange={(checked) => toggle(option, checked === true)}
                        />
                        {option}
                    </label>
                ))}
                {options.length === 0 && (
                    <span className="text-sm text-muted-foreground">{t("noOptions")}</span>
                )}
            </div>
        </FieldShell>
    )
}
