"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"
import { toast } from "sonner"
import type { CreateWarehouseDto, UpdateWarehouseDto } from "@devloggers/api-contracts"
import { warehouseResource } from "@devloggers/api-contracts"
import { Rhform, RhfCheckboxField, RhfTextField } from "@/shared/components/form"
import { useFormDialog } from "@/shared/components/form-dialog"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useApi } from "@/shared/useApi"
import {
    warehouseFormSchema,
    DEFAULT_WAREHOUSE_FORM_VALUES,
    mapWarehouseToFormValues,
    type WarehouseFormValues,
} from "../warehouses.config"

export type WarehousesFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
    paramKey?: string
}

function mapCreatePayload(values: WarehouseFormValues): CreateWarehouseDto {
    return {
        code: values.code.trim(),
        name: values.name.trim(),
        address: values.address?.trim() || undefined,
    }
}

function mapUpdatePayload(values: WarehouseFormValues): UpdateWarehouseDto {
    return {
        code: values.code.trim(),
        name: values.name.trim(),
        address: values.address?.trim() || null,
        isActive: values.isActive ?? true,
    }
}

export function WarehousesForm({ resourceId, initialData, onSuccess, paramKey }: WarehousesFormProps) {
    const api = useApi()
    const { close } = useFormDialog(paramKey)

    const { form, isEditing, isInitializing } = useResourceForm<WarehouseFormValues, unknown>({
        schema: warehouseFormSchema,
        defaultValues: DEFAULT_WAREHOUSE_FORM_VALUES,
        resourceId,
        initialize: (id) => api.warehouses.show(id),
        initialData,
        queryKey: [warehouseResource.routes.show, resourceId],
        mapToFormValues: mapWarehouseToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: WarehouseFormValues) => {
            const promise = isEditing && resourceId
                ? api.warehouses.update(resourceId, mapUpdatePayload(values))
                : api.warehouses.create(mapCreatePayload(values))

            toast.promise(promise, {
                loading: isEditing ? "Updating warehouse..." : "Creating warehouse...",
                success: isEditing ? "Warehouse updated successfully" : "Warehouse created successfully",
                error: isEditing ? "Failed to update warehouse" : "Failed to create warehouse",
            })

            return promise
        },
        onSuccess: () => {
            form.reset(DEFAULT_WAREHOUSE_FORM_VALUES)
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
                        {isEditing ? "Failed to update warehouse" : "Failed to create warehouse"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}
            <FieldGroup>
                <RhfTextField
                    name="code"
                    label="Code"
                    placeholder="e.g. WH-01"
                    required
                    disabled={isBusy}
                />
                <RhfTextField
                    name="name"
                    label="Name"
                    placeholder="e.g. Main Warehouse"
                    required
                    disabled={isBusy}
                />
                <RhfTextField
                    name="address"
                    label="Address"
                    placeholder="Warehouse location"
                    disabled={isBusy}
                />
                {isEditing && (
                    <RhfCheckboxField
                        name="isActive"
                        label="Active"
                        description="Inactive warehouses remain available historically but are hidden from active choices."
                        disabled={isBusy}
                    />
                )}
                <Button type="submit" variant="default" disabled={isBusy}>
                    {isEditing ? <Save /> : <Plus />}
                    {isBusy
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Warehouse" : "Create Warehouse")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
