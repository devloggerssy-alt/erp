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
    RhfAsyncSelectField,
    RhfAsyncMultiSelectField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"

import {
    estimateFormSchema,
    type EstimateFormValues,
} from "./estimate.schema"
import { ESTIMATE_ROUTES, CUSTOMER_ROUTES, VEHICLE_ROUTES, DEPARTMENT_ROUTES, LABEL_ROUTES } from "@garage/api"

// ── Props ──

export type EstimateFormProps = {
    resourceId?: string | null
    initialData?: Partial<EstimateFormValues>
    onSuccess?: () => void
    defaultVehicleId?: string | null
}

// ── Default values ──

const DEFAULT_VALUES: EstimateFormValues = {
    title: "",
    customer: null,
    vehicle: null,
    department: null,
    estimate_number: "",
    date: "",
    has_insurance: false,
    remarks: "",
    labels: [],
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): EstimateFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        title: d.title || "",
        customer: toRelation(d.customer_id, d.customer_name),
        vehicle: toRelation(d.vehicle_id, d.vehicle_name),
        department: toRelation(d.department_id, d.department_name),
        estimate_number: d.estimate_number || "",
        date: d.date || "",
        has_insurance: d.has_insurance ?? false,
        remarks: Array.isArray(d.remarks) ? d.remarks.join("\n") : d.remarks || "",
        labels: Array.isArray(d.labels)
            ? d.labels.map((l: any) => ({ value: String(l.id), label: l.name }))
            : [],
    }
}

function mapFormToPayload(values: EstimateFormValues) {
    return {
        title: values.title,
        customer_id: toId(values.customer),
        vehicle_id: toId(values.vehicle),
        department_id: toId(values.department),
        estimate_number: values.estimate_number || undefined,
        date: values.date || undefined,
        has_insurance: values.has_insurance,
        remarks: values.remarks
            ? values.remarks.split("\n").filter(Boolean)
            : [],
        label_ids: values.labels.map((l) => Number(l.value)),
    }
}

// ── Shared mapOption for async selects ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name,
})

const mapCustomerOption = (item: any) => ({
    value: String(item.id),
    label: [item.first_name, item.last_name].filter(Boolean).join(" "),
})

const mapVehicleOption = (item: any) => ({
    value: String(item.id),
    label: [item.year, item.make_name, item.model_name].filter(Boolean).join(" "),
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

// ── Component ──

export function EstimateForm({ resourceId, initialData, onSuccess }: EstimateFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<EstimateFormValues, any>({
        schema: estimateFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        queryKey: [ESTIMATE_ROUTES.BY_ID, resourceId],
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: EstimateFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = (isEditing && resourceId
                ? api.estimates.update(resourceId, payload)
                : api.estimates.create(payload)) as Promise<any>
            toast.promise(promise, {
                loading: isEditing ? "Updating estimate..." : "Creating estimate...",
                success: isEditing ? "Estimate updated successfully" : "Estimate created successfully",
                error: isEditing ? "Failed to update estimate" : "Failed to create estimate",
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
                        {isEditing ? "Failed to update estimate" : "Failed to create estimate"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField name="title" label="Title" placeholder="Estimate title" required />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="estimate_number" label="Estimate Number" placeholder="EST-001" />
                    <RhfTextField name="date" label="Date" type="date" />
                </div>

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
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncMultiSelectField
                        name="labels"
                        label="Labels"
                        placeholder="Select labels"
                        multiple
                        queryKey={[LABEL_ROUTES.INDEX]}
                        listFn={() => api.labels.list()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                </div>

                <RhfCheckboxField name="has_insurance" label="Has Insurance" />

                <RhfTextareaField name="remarks" label="Remarks" placeholder="Enter remarks (one per line)" rows={3} />

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Estimate" : "Create Estimate")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
