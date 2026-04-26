"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
    RhfAsyncSelectField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"
import { InspectionCategoryInlineForm } from "./inline-forms/inspection-category-inline-form"
import { DepartmentInlineForm } from "@/modules/services/inline-forms/department-inline-form"

import {
    inspectionFormSchema,
    type InspectionFormValues,
} from "./inspection.schema"
import {
    INSPECTION_ROUTES,
    CUSTOMER_ROUTES,
    VEHICLE_ROUTES,
    DEPARTMENT_ROUTES,
    EMPLOYEE_ROUTES,
} from "@devloggers/api-client"

// ── Props ──

export type InspectionFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: InspectionFormValues = {
    customer: null,
    vehicle: null,
    department: null,
    inspection_category: null,
    employee: null,
    title: "",
    order_number: "",
    date: "",
    time: "",
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): InspectionFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        customer: toRelation(d.customer_id, d.customer?.first_name ? `${d.customer.first_name} ${d.customer.last_name ?? ""}`.trim() : undefined),
        vehicle: toRelation(d.vehicle_id, d.vehicle?.make ? `${d.vehicle.make} ${d.vehicle.model ?? ""}`.trim() : undefined),
        department: toRelation(d.department_id, d.department?.name),
        inspection_category: toRelation(d.inspection_category_id, d.inspection_category?.name),
        employee: toRelation(d.employee_id, d.employee?.first_name ? `${d.employee.first_name} ${d.employee.last_name ?? ""}`.trim() : undefined),
        title: d.title ?? "",
        order_number: d.order_number ?? "",
        date: d.date ?? "",
        time: d.time ?? "",
    }
}

function mapFormToPayload(values: InspectionFormValues) {
    return {
        customer_id: toId(values.customer),
        vehicle_id: toId(values.vehicle),
        department_id: toId(values.department),
        inspection_category_id: toId(values.inspection_category),
        employee_id: toId(values.employee),
        title: values.title,
        order_number: values.order_number || undefined,
        date: values.date || undefined,
        time: values.time || undefined,
    }
}

// ── Shared mapOption for async selects ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name ?? item.title ?? String(item.id),
})

const mapCustomerOption = (item: any) => ({
    value: String(item.id),
    label: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || String(item.id),
})

const mapVehicleOption = (item: any) => ({
    value: String(item.id),
    label: `${item.make ?? ""} ${item.model ?? ""} ${item.year ?? ""}`.trim() || String(item.id),
})

const mapEmployeeOption = (item: any) => ({
    value: String(item.id),
    label: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || String(item.id),
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

// ── Component ──

export function InspectionForm({ resourceId, initialData, onSuccess }: InspectionFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<InspectionFormValues, any>({
        schema: inspectionFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        queryKey: [INSPECTION_ROUTES.BY_ID, resourceId],
        mapToFormValues: mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: InspectionFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.inspections.update(resourceId, payload)
                : api.inspections.create(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating inspection..." : "Creating inspection...",
                success: isEditing ? "Inspection updated successfully" : "Inspection created successfully",
                error: isEditing ? "Failed to update inspection" : "Failed to create inspection",
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
                        {isEditing ? "Failed to update inspection" : "Failed to create inspection"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField name="title" label="Title" placeholder="e.g. Pre-purchase" required />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="customer"
                        label="Customer"
                        placeholder="Select customer"
                        queryKey={[CUSTOMER_ROUTES.INDEX]}
                        listFn={() => api.customers.list()}
                        mapOption={mapCustomerOption}
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="vehicle"
                        label="Vehicle"
                        placeholder="Select vehicle"
                        queryKey={[VEHICLE_ROUTES.INDEX]}
                        listFn={() => api.vehicles.list()}
                        mapOption={mapVehicleOption}
                        {...STORE_OBJECT}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="department"
                        label="Department"
                        placeholder="Select department"
                        queryKey={[DEPARTMENT_ROUTES.INDEX]}
                        listFn={() => api.departments.list()}
                        mapOption={mapLookupOption}
                        createForm={(props) => <DepartmentInlineForm {...props} />}
                        createLabel="Department"
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="inspection_category"
                        label="Inspection Category"
                        placeholder="Select category"
                        queryKey={[INSPECTION_ROUTES.CATEGORIES]}
                        listFn={() => api.inspections.listCategories()}
                        mapOption={mapLookupOption}
                        createForm={(props) => <InspectionCategoryInlineForm {...props} />}
                        createLabel="Inspection Category"
                        {...STORE_OBJECT}
                    />
                </div>

                <RhfAsyncSelectField
                    name="employee"
                    label="Employee"
                    placeholder="Select employee"
                    queryKey={[EMPLOYEE_ROUTES.INDEX]}
                    listFn={() => api.employees.list()}
                    mapOption={mapEmployeeOption}
                    {...STORE_OBJECT}
                />

                <RhfTextField name="order_number" label="Order Number" placeholder="e.g. ORD-001" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="date" label="Date" placeholder="YYYY-MM-DD" type="date" />
                    <RhfTextField name="time" label="Time" placeholder="HH:MM:SS" type="time" />
                </div>

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Inspection" : "Create Inspection")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
