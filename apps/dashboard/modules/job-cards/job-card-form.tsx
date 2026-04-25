"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
    RhfSelectField,
    RhfAsyncSelectField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"

import {
    jobCardFormSchema,
    type JobCardFormValues,
    TAX_INCLUSIVE_OPTIONS,
    DISCOUNT_TYPE_OPTIONS,
    DISCOUNT_AT_OPTIONS,
} from "./job-card.schema"
import { JOB_CARD_ROUTES, CUSTOMER_ROUTES, VEHICLE_ROUTES } from "@devloggers/api-client"

// ── Props ──

export type JobCardFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: JobCardFormValues = {
    title: "",
    customer: null,
    vehicle: null,
    status: "draft",
    tax_inclusive: "Tax Inclusive",
    discount_type: "no",
    discount_at: "inclusive_of_tax",
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): JobCardFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        title: d.title || "",
        customer: toRelation(d.customer_id, d.customer_name),
        vehicle: toRelation(d.vehicle_id, d.vehicle_name),
        status: d.status || "draft",
        tax_inclusive: d.tax_inclusive || "Tax Inclusive",
        discount_type: d.discount_type || "no",
        discount_at: d.discount_at || "inclusive_of_tax",
    }
}

function mapFormToPayload(values: JobCardFormValues) {
    return {
        title: values.title,
        customer_id: toId(values.customer),
        vehicle_id: toId(values.vehicle),
        status: values.status || undefined,
        tax_inclusive: values.tax_inclusive || undefined,
        discount_type: values.discount_type || undefined,
        discount_at: values.discount_at || undefined,
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

export function JobCardForm({ resourceId, initialData, onSuccess }: JobCardFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<JobCardFormValues, any>({
        schema: jobCardFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        queryKey: [JOB_CARD_ROUTES.BY_ID, resourceId],
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: JobCardFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = (isEditing && resourceId
                ? api.jobCards.update(resourceId, payload)
                : api.jobCards.create(payload)) as Promise<any>
            toast.promise(promise, {
                loading: isEditing ? "Updating job card..." : "Creating job card...",
                success: isEditing ? "Job card updated successfully" : "Job card created successfully",
                error: isEditing ? "Failed to update job card" : "Failed to create job card",
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
                        {isEditing ? "Failed to update job card" : "Failed to create job card"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField name="title" label="Title" placeholder="Job Card 001" required />

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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <RhfSelectField
                        name="tax_inclusive"
                        label="Tax"
                        placeholder="Select tax type"
                        options={TAX_INCLUSIVE_OPTIONS}
                    />
                    <RhfSelectField
                        name="discount_type"
                        label="Discount Type"
                        placeholder="Select discount type"
                        options={DISCOUNT_TYPE_OPTIONS}
                    />
                    <RhfSelectField
                        name="discount_at"
                        label="Discount At"
                        placeholder="Select discount at"
                        options={DISCOUNT_AT_OPTIONS}
                    />
                </div>

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Job Card" : "Create Job Card")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
