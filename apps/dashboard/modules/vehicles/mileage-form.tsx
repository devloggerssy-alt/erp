"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import { Rhform, RhfTextField } from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"

import { mileageFormSchema, type MileageFormValues } from "./mileage.schema"

// ── Props ──

export type MileageFormProps = {
    vehicleId: string
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: MileageFormValues = {
    mileage: 0,
    date: "",
    time: "",
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): MileageFormValues {
    const d = (data as any)?.data ?? data ?? {}
    return {
        mileage: d.mileage ?? 0,
        date: d.date || "",
        time: d.time || "",
    }
}

// ── Component ──

export function MileageForm({ vehicleId, resourceId, initialData, onSuccess }: MileageFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<MileageFormValues, any>({
        schema: mileageFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: MileageFormValues) => {
            const payload = { mileage: values.mileage, date: values.date, time: values.time }
            const promise = isEditing && resourceId
                ? api.vehicleDocuments.updateMileage(resourceId, payload as any)
                : api.vehicleDocuments.createMileage({ vehicle_id: Number(vehicleId), ...payload } as any)
            toast.promise(promise, {
                loading: isEditing ? "Updating mileage..." : "Adding mileage...",
                success: isEditing ? "Mileage updated successfully" : "Mileage added successfully",
                error: isEditing ? "Failed to update mileage" : "Failed to add mileage",
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
                        {isEditing ? "Failed to update mileage" : "Failed to add mileage"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField
                    name="mileage"
                    label="Mileage"
                    placeholder="e.g. 50000"
                    type="number"
                    required
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField
                        name="date"
                        label="Date"
                        type="date"
                        required
                    />
                    <RhfTextField
                        name="time"
                        label="Time"
                        type="time"
                        required
                    />
                </div>

                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? null : isEditing ? <Save /> : <Plus />}
                    {isPending ? "Saving..." : isEditing ? "Update Mileage" : "Add Mileage"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
