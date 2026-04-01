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
    RhfCheckboxField,
} from "@/shared/components/form"
import { ShopTypeInlineForm } from "@/modules/vehicles/inline-forms/shop-type-inline-form"
import { InventoryCategoryInlineForm } from "@/modules/services/inline-forms/inventory-category-inline-form"
import { UnitTypeInlineForm } from "@/modules/services/inline-forms/unit-type-inline-form"
import { DepartmentInlineForm } from "@/modules/services/inline-forms/department-inline-form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toId } from "@/shared/lib/utils"

import { serviceGroupFormSchema, type ServiceGroupFormValues } from "./service-group.schema"
import { SERVICE_GROUP_ROUTES } from "@garage/api"

// ── Props ──

export type ServiceGroupFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: ServiceGroupFormValues = {
    shop_type: null,
    inventory_category: null,
    unit_type: null,
    department: null,
    service_name: "",
    code: "",
    service_description: "",
    selling_price: undefined,
    selling_chart_of_account: "",
    show_as_lump_sum: false,
    mark_as_recommended: false,
    set_packaged_pricing: false,
    is_active: true,
}

// ── Mapping helpers ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name ?? item.title ?? String(item.id),
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

function mapToFormValues(data: unknown): ServiceGroupFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        shop_type: null,
        inventory_category: null,
        unit_type: null,
        department: null,
        service_name: d.service_name ?? d.name ?? "",
        code: d.code ?? "",
        service_description: d.service_description ?? "",
        selling_price: d.selling_price ?? undefined,
        selling_chart_of_account: d.selling_chart_of_account ?? "",
        show_as_lump_sum: d.show_as_lump_sum ?? false,
        mark_as_recommended: d.mark_as_recommended ?? false,
        set_packaged_pricing: d.set_packaged_pricing ?? false,
        is_active: d.is_active ?? true,
    }
}

function mapCreatePayload(values: ServiceGroupFormValues) {
    return {
        service_name: values.service_name,
        shop_type_id: toId(values.shop_type),
        code: values.code || undefined,
        inventory_category_id: toId(values.inventory_category),
        unit_type_id: toId(values.unit_type),
        department_id: toId(values.department),
        service_description: values.service_description || undefined,
        show_as_lump_sum: values.show_as_lump_sum,
        mark_as_recommended: values.mark_as_recommended,
        set_packaged_pricing: values.set_packaged_pricing,
        selling_price: values.selling_price,
        selling_chart_of_account: values.selling_chart_of_account || undefined,
        is_active: values.is_active,
    }
}

function mapUpdatePayload(values: ServiceGroupFormValues) {
    return {
        service_name: values.service_name,
        selling_price: values.selling_price,
        is_active: values.is_active,
    }
}

// ── Component ──

export function ServiceGroupForm({ resourceId, initialData, onSuccess }: ServiceGroupFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<ServiceGroupFormValues, any>({
        schema: serviceGroupFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: ServiceGroupFormValues) => {
            const promise = isEditing && resourceId
                ? api.serviceGroups.update(resourceId, mapUpdatePayload(values))
                : api.serviceGroups.create(mapCreatePayload(values))
            toast.promise(promise, {
                loading: isEditing ? "Updating service group..." : "Creating service group...",
                success: isEditing ? "Service group updated" : "Service group created",
                error: isEditing ? "Failed to update service group" : "Failed to create service group",
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
                        {isEditing ? "Failed to update service group" : "Failed to create service group"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField
                        name="service_name"
                        label="Service Name"
                        placeholder="e.g. Engine Service Group"
                        required
                    />
                    <RhfTextField
                        name="code"
                        label="Code"
                        placeholder="e.g. SG-001"
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
                                name="inventory_category"
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
                    </>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField
                        name="selling_price"
                        label="Selling Price"
                        placeholder="0.00"
                        type="number"
                    />
                    <RhfTextField
                        name="selling_chart_of_account"
                        label="Selling Chart of Account"
                        placeholder="e.g. 4000"
                    />
                </div>

                <RhfTextareaField
                    name="service_description"
                    label="Description"
                    placeholder="Optional description"
                    rows={3}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfCheckboxField
                        name="show_as_lump_sum"
                        label="Show as Lump Sum"
                    />
                    <RhfCheckboxField
                        name="mark_as_recommended"
                        label="Recommended"
                    />
                    <RhfCheckboxField
                        name="set_packaged_pricing"
                        label="Set Packaged Pricing"
                    />
                    <RhfCheckboxField
                        name="is_active"
                        label="Active"
                    />
                </div>


            </FieldGroup>

            <div className="mt-4 flex justify-end">
                <Button type="submit" disabled={isPending}>
                    {isEditing ? <Save className="me-2 h-4 w-4" /> : <Plus className="me-2 h-4 w-4" />}
                    {isPending
                        ? isEditing ? "Updating..." : "Creating..."
                        : isEditing ? "Update Service Group" : "Create Service Group"}
                </Button>
            </div>
        </Rhform>
    )
}
