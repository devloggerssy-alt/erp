"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"
import { toast } from "sonner"
import type { CreateUnitDto, UpdateUnitDto } from "@devloggers/api-contracts"
import { unitResource } from "@devloggers/api-contracts"
import { Rhform, RhfCheckboxField, RhfTextField } from "@/shared/components/form"
import { useFormDialog } from "@/shared/components/form-dialog"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useApi } from "@/shared/useApi"
import {
    unitFormSchema,
    DEFAULT_UNIT_FORM_VALUES,
    mapUnitToFormValues,
    type UnitFormValues,
} from "../units.config"

export type UnitsFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
    paramKey?: string
}

function mapCreatePayload(values: UnitFormValues): CreateUnitDto {
    return {
        name: values.name.trim(),
        abbreviation: values.abbreviation.trim(),
    }
}

function mapUpdatePayload(values: UnitFormValues): UpdateUnitDto {
    return {
        name: values.name.trim(),
        abbreviation: values.abbreviation.trim(),
        isActive: values.isActive ?? true,
    }
}

export function UnitsForm({ resourceId, initialData, onSuccess, paramKey }: UnitsFormProps) {
    const api = useApi()
    const { close } = useFormDialog(paramKey)

    const { form, isEditing, isInitializing } = useResourceForm<UnitFormValues, unknown>({
        schema: unitFormSchema,
        defaultValues: DEFAULT_UNIT_FORM_VALUES,
        resourceId,
        initialize: (id) => api.units.show(id),
        initialData,
        queryKey: [unitResource.routes.show, resourceId],
        mapToFormValues: mapUnitToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: UnitFormValues) => {
            const promise = isEditing && resourceId
                ? api.units.update(resourceId, mapUpdatePayload(values))
                : api.units.create(mapCreatePayload(values))

            toast.promise(promise, {
                loading: isEditing ? "Updating unit..." : "Creating unit...",
                success: isEditing ? "Unit updated successfully" : "Unit created successfully",
                error: isEditing ? "Failed to update unit" : "Failed to create unit",
            })

            return promise
        },
        onSuccess: () => {
            form.reset(DEFAULT_UNIT_FORM_VALUES)
            close()
            onSuccess?.()
        },
    })

    const isBusy = isPending || isInitializing

    return (
        <Rhform form={form} onSubmit={(values) => mutate(values)}>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="me-2 h-4 w-4" />
                    <AlertTitle>
                        {isEditing ? "Failed to update unit" : "Failed to create unit"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}
            <FieldGroup>
                <RhfTextField
                    name="name"
                    label="الأسم"
                    placeholder="e.g. Kilogram"
                    required
                    disabled={isBusy}
                />
                <RhfTextField
                    name="abbreviation"
                    label="الاختصار"
                    placeholder="e.g. kg"
                    required
                    disabled={isBusy}
                />
                {isEditing && (
                    <RhfCheckboxField
                        name="isActive"
                        label="Active"
                        description="Inactive units remain available historically but are hidden from active choices."
                        disabled={isBusy}
                    />
                )}
                <Button type="submit" variant="default" disabled={isBusy}>
                    {isEditing ? <Save /> : <Plus />}
                    {isBusy
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Unit" : "Create Unit")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}