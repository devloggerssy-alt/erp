"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
    RhfTextareaField,
    RhfAsyncSelectField,
} from "@/shared/components/form"
import { ShopTypeInlineForm } from "@/modules/vehicles/inline-forms/shop-type-inline-form"
import { InventoryCategoryInlineForm } from "./inline-forms/inventory-category-inline-form"
import { UnitTypeInlineForm } from "./inline-forms/unit-type-inline-form"
import { DepartmentInlineForm } from "./inline-forms/department-inline-form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toId } from "@/shared/lib/utils"

import { serviceFormSchema, type ServiceFormValues } from "./service.schema"
import { SERVICE_ROUTES } from "@garage/api"

// ── Props ──

export type ServiceFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: ServiceFormValues = {
    shop_type: null,
    category: null,
    unit_type: null,
    department: null,
    labor_name: "",
    service_code: "",
    labor_matrix: "",
    description: "",
    selling_price: undefined,
}

// ── Mapping helpers ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name ?? item.title ?? String(item.id),
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

function mapToFormValues(data: unknown): ServiceFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        shop_type: null,
        category: null,
        unit_type: null,
        department: null,
        labor_name: d.name || d.labor_name || "",
        service_code: d.service_code || "",
        labor_matrix: d.labor_matrix || "",
        description: d.description || "",
        selling_price: d.selling_price ?? undefined,
    }
}

function mapCreatePayload(values: ServiceFormValues) {
    return {
        shop_type_id: toId(values.shop_type),
        category_id: toId(values.category),
        unit_type_id: toId(values.unit_type),
        department_id: toId(values.department),
        labor_name: values.labor_name,
        service_code: values.service_code || undefined,
        labor_matrix: values.labor_matrix || undefined,
        description: values.description || undefined,
        selling_price: values.selling_price,
    }
}

function mapUpdatePayload(values: ServiceFormValues) {
    return {
        labor_name: values.labor_name,
        selling_price: values.selling_price,
    }
}

// ── Component ──

export function ServiceForm({ resourceId, initialData, onSuccess }: ServiceFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<ServiceFormValues, any>({
        schema: serviceFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: ServiceFormValues) => {
            const promise = isEditing && resourceId
                ? api.services.update(resourceId, mapUpdatePayload(values))
                : api.services.create(mapCreatePayload(values))
            toast.promise(promise, {
                loading: isEditing ? "Updating service..." : "Creating service...",
                success: isEditing ? "Service updated successfully" : "Service created successfully",
                error: isEditing ? "Failed to update service" : "Failed to create service",
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
                        {isEditing ? "Failed to update service" : "Failed to create service"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField
                        name="labor_name"
                        label="Labor Name"
                        placeholder="e.g. Oil Change"
                        required
                    />
                    <RhfTextField
                        name="service_code"
                        label="Service Code"
                        placeholder="e.g. SVC-001"
                    />
                </div>

                {!isEditing && (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <RhfAsyncSelectField
                                name="shop_type"
                                label="Shop Type"
                                placeholder="Select shop type"
                                queryKey={["shop-types"]}
                                listFn={() => api.shopTypes.list()}
                                mapOption={mapLookupOption}
                                createForm={(props) => <ShopTypeInlineForm {...props} />}
                                createLabel="Shop Type"
                                {...STORE_OBJECT}
                            />
                            <RhfAsyncSelectField
                                name="category"
                                label="Category"
                                placeholder="Select category"
                                queryKey={["inventory-categories"]}
                                listFn={() => api.inventory.listCategories()}
                                mapOption={mapLookupOption}
                                createForm={(props) => <InventoryCategoryInlineForm {...props} />}
                                createLabel="Category"
                                {...STORE_OBJECT}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <RhfAsyncSelectField
                                name="unit_type"
                                label="Unit Type"
                                placeholder="Select unit type"
                                queryKey={["unit-types"]}
                                listFn={() => api.inventory.listUnitTypes()}
                                mapOption={mapLookupOption}
                                createForm={(props) => <UnitTypeInlineForm {...props} />}
                                createLabel="Unit Type"
                                {...STORE_OBJECT}
                            />
                            <RhfAsyncSelectField
                                name="department"
                                label="Department"
                                placeholder="Select department"
                                queryKey={["departments"]}
                                listFn={() => api.departments.list()}
                                mapOption={(item: any) => ({ value: String(item.id), label: item.name ?? String(item.id) })}
                                createForm={(props) => <DepartmentInlineForm {...props} />}
                                createLabel="Department"
                                {...STORE_OBJECT}
                            />
                        </div>

                        <RhfTextField
                            name="labor_matrix"
                            label="Labor Matrix"
                            placeholder="e.g. Standard"
                        />
                    </>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField
                        name="selling_price"
                        label="Selling Price"
                        type="number"
                        placeholder="e.g. 75"
                    />
                </div>

                <RhfTextareaField
                    name="description"
                    label="Description"
                    placeholder="Describe the service..."
                    rows={3}
                />

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Service" : "Create Service")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
