"use client"

import { AlertTriangle, Plus } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"

import { holidayYearFormSchema, type HolidayYearFormValues } from "./holiday-year.schema"

// ── Props ──

export type HolidayYearFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: HolidayYearFormValues = {
    year: new Date().getFullYear(),
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): HolidayYearFormValues {
    const d = (data as any)?.data ?? data ?? {}
    return {
        year: d.year ?? new Date().getFullYear(),
    }
}

// ── Component ──

export function HolidayYearForm({ resourceId, initialData, onSuccess }: HolidayYearFormProps) {
    const api = useAuthApi()

    const { form } = useResourceForm<HolidayYearFormValues, any>({
        schema: holidayYearFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId: null,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: HolidayYearFormValues) => {
            const promise = api.holidayYears.create({ year: values.year })
            toast.promise(promise, {
                loading: "Creating holiday year...",
                success: "Holiday year created successfully",
                error: "Failed to create holiday year",
            })
            return promise
        },
        onSuccess: () => {
            form.reset()
            onSuccess?.()
        },
    })

    return (
        <Rhform form={form} onSubmit={(values) => mutate(values)}>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="me-2 h-4 w-4" />
                    <AlertTitle>Failed to create holiday year</AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField
                    name="year"
                    label="Year"
                    placeholder="e.g. 2026"
                    type="number"
                    required
                />

                <Button type="submit" variant="default" disabled={isPending}>
                    <Plus />
                    {isPending ? "Creating..." : "Create Holiday Year"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
