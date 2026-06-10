"use client"

import { useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { SlidersHorizontal } from "lucide-react"
import type { CustomFieldModule, CustomFieldResponseDto } from "@devloggers/api-contracts"
import { deserializeCustomFieldValue } from "@devloggers/api-contracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { CustomFieldInput } from "./custom-field-input"
import { useCustomFieldDefinitions } from "./use-custom-field-definitions"

type CustomFieldsFormSectionProps = {
    module: CustomFieldModule
    disabled?: boolean
    /** Render a discoverable empty-state card instead of null when no fields are configured. */
    showWhenEmpty?: boolean
}

export function buildCustomFieldDefaults(definitions: CustomFieldResponseDto[]): Record<string, unknown> {
    const defaults: Record<string, unknown> = {}
    for (const field of definitions) {
        if (!field.defaultValue) continue
        defaults[field.id] = deserializeCustomFieldValue(field.type, field.defaultValue)
    }
    return defaults
}

export function CustomFieldsFormSection({
    module,
    disabled = false,
    showWhenEmpty = false,
}: CustomFieldsFormSectionProps) {
    const t = useTranslations("system.customFields")
    const locale = useLocale()
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
        if (!showWhenEmpty) return null

        return (
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle>{t("sectionTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="rounded-full bg-muted p-3">
                        <SlidersHorizontal className="size-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">{t("emptyTitle")}</p>
                        <p className="text-xs text-muted-foreground">{t("emptyDescription")}</p>
                    </div>
                    <Link
                        href={`/${locale}/catalog/custom-fields`}
                        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                        {t("manage")} →
                    </Link>
                </CardContent>
            </Card>
        )
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
