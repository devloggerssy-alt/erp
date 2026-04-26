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
import { InventoryCategoryInlineForm } from "@/modules/services/inline-forms/inventory-category-inline-form"
import { UnitTypeInlineForm } from "@/modules/services/inline-forms/unit-type-inline-form"
import { DepartmentInlineForm } from "@/modules/services/inline-forms/department-inline-form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toId } from "@/shared/lib/utils"

import { partFormSchema, type PartFormValues } from "./part.schema"
import { PARTS_ROUTES } from "@garage/api"

// ── Props ──

export type PartFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: PartFormValues = {
    shop_type: null,
    category: null,
    unit_type: null,
    department: null,
    title: "",
    sku: "",
    description: "",
    selling_price: undefined,
    purchase_price: undefined,
}

// ── Mapping helpers ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name ?? item.title ?? String(item.id),
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

function mapToFormValues(data: unknown): PartFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        shop_type: null,
        category: null,
        unit_type: null,
        department: null,
        title: d.title ?? d.name ?? "",
        sku: d.sku ?? "",
        description: d.description ?? "",
        selling_price: d.selling_price ?? undefined,
        purchase_price: d.purchase_price ?? undefined,
    }
}

function mapCreatePayload(values: PartFormValues) {
    return {
        shop_type_id: toId(values.shop_type),
        category_id: toId(values.category),
        unit_type_id: toId(values.unit_type),
        department_id: toId(values.department),
        title: values.title,
        sku: values.sku || undefined,
        description: values.description || undefined,
        selling_price: values.selling_price,
        purchase_price: values.purchase_price,
    }
}

function mapUpdatePayload(values: PartFormValues) {
    return {
        title: values.title,
        selling_price: values.selling_price,
    }
}

// ── Component ──

export function PartForm({ resourceId, initialData, onSuccess }: PartFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<PartFormValues, any>({
        schema: partFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: PartFormValues) => {
            const promise = isEditing && resourceId
                ? api.parts.update(resourceId, mapUpdatePayload(values))
                : api.parts.create(mapCreatePayload(values))
            toast.promise(promise, {
                loading: isEditing ? "Updating part..." : "Creating part...",
                success: isEditing ? "Part updated successfully" : "Part created successfully",
                error: isEditing ? "Failed to update part" : "Failed to create part",
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
                        {isEditing ? "Failed to update part" : "Failed to create part"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField
                        name="title"
                        label="Title"
                        placeholder="e.g. Brake Pad"
                        required
                    />
                    <RhfTextField
                        name="sku"
                        label="SKU"
                        placeholder="e.g. BP-001"
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
                    </>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField
                        name="selling_price"
                        label="Selling Price"
                        placeholder="0.00"
                        type="number"
                    />
                    {!isEditing && (
                        <RhfTextField
                            name="purchase_price"
                            label="Purchase Price"
                            placeholder="0.00"
                            type="number"
                        />
                    )}
                </div>

                <RhfTextareaField
                    name="description"
                    label="Description"
                    placeholder="Optional description"
                    rows={3}
                />
            </FieldGroup>

            <div className="mt-4 flex justify-end">
                <Button type="submit" disabled={isPending}>
                    {isEditing ? <Save className="me-2 h-4 w-4" /> : <Plus className="me-2 h-4 w-4" />}
                    {isPending
                        ? isEditing ? "Updating..." : "Creating..."
                        : isEditing ? "Update Part" : "Create Part"}
                </Button>
            </div>
        </Rhform>
    )
}
