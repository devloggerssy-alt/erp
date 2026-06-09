"use client"

import { useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { useTranslations } from "next-intl"
import type { CustomFieldModule, CustomFieldResponseDto } from "@devloggers/api-contracts"
import { deserializeCustomFieldValue } from "@devloggers/api-contracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { CustomFieldInput } from "./custom-field-input"
import { useCustomFieldDefinitions } from "./use-custom-field-definitions"

type CustomFieldsFormSectionProps = {
    module: CustomFieldModule
    disabled?: boolean
}

export function buildCustomFieldDefaults(definitions: CustomFieldResponseDto[]): Record<string, unknown> {
    const defaults: Record<string, unknown> = {}
    for (const field of definitions) {
        if (!field.defaultValue) continue
        defaults[field.id] = deserializeCustomFieldValue(field.type, field.defaultValue)
    }
    return defaults
}

export function CustomFieldsFormSection({ module, disabled = false }: CustomFieldsFormSectionProps) {
    const t = useTranslations("system.customFields")
    const { definitions, isLoading } = useCustomFieldDefinitions(module)
    const { setValue, getValues } = useFormContext()

    useEffect(() => {
        if (definitions.length === 0) return
        const current = (getValues("customFields") as Record<string, unknown> | undefined) ?? {}
        const defaults = buildCustomFieldDefaults(definitions)
        setValue("customFields", { ...defaults, ...current }, { shouldDirty: false })
    }, [definitions, getValues, setValue])

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t("sectionTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (definitions.length === 0) {
        return null
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("sectionTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                {definitions.map((field) => (
                    <CustomFieldInput key={field.id} field={field} disabled={disabled} />
                ))}
            </CardContent>
        </Card>
    )
}
