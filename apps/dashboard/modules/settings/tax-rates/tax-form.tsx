"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
    RhfTextareaField,
    RhfCheckboxField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"

import { taxFormSchema, type TaxFormValues } from "./tax.schema"
import { TAX_ROUTES } from "@devloggers/api-client"

// ── Props ──

export type TaxFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: TaxFormValues = {
    title: "",
    note: "",
    rate: 0,
    is_default: false,
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): TaxFormValues {
    const d = (data as any)?.data ?? data ?? {}
    return {
        title: d.title ?? "",
        note: d.note ?? "",
        rate: d.rate ? Number(d.rate) : 0,
        is_default: d.is_default ?? false,
    }
}

function mapFormToPayload(values: TaxFormValues) {
    return {
        title: values.title,
        note: values.note || undefined,
        rate: values.rate,
        is_default: values.is_default,
    }
}

// ── Component ──

export function TaxForm({ resourceId, initialData, onSuccess }: TaxFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<TaxFormValues, any>({
        schema: taxFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        queryKey: [TAX_ROUTES.BY_ID, resourceId],
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: TaxFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.taxes.update(resourceId, payload)
                : api.taxes.create(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating tax..." : "Creating tax...",
                success: isEditing ? "Tax updated successfully" : "Tax created successfully",
                error: isEditing ? "Failed to update tax" : "Failed to create tax",
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
                    <AlertTitle>
                        {isEditing ? "Failed to update tax" : "Failed to create tax"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField
                    name="title"
                    label="Title"
                    placeholder="e.g. VAT"
                    required
                />
                <RhfTextField
                    name="rate"
                    label="Rate (%)"
                    placeholder="e.g. 18"
                    type="number"
                    required
                />
                <RhfTextareaField
                    name="note"
                    label="Note"
                    placeholder="Optional description"
                    rows={3}
                />
                <RhfCheckboxField
                    name="is_default"
                    label="Set as default"
                />

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Tax" : "Create Tax")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
