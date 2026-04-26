"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
    RhfSelectField,
    RhfTextareaField,
    RhfAsyncSelectField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"

import {
    invoiceFormSchema,
    type InvoiceFormValues,
} from "./invoice.schema"
import { INVOICE_ROUTES, CUSTOMER_ROUTES, VEHICLE_ROUTES, DEPARTMENT_ROUTES } from "@garage/api"

// ── Constants ──

const STATUS_OPTIONS = [
    { value: "draft", label: "Draft" },
    { value: "open", label: "Open" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
    { value: "void", label: "Void" },
]

// ── Props ──

export type InvoiceFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: InvoiceFormValues = {
    subject: "",
    customer: null,
    vehicle: null,
    department: null,
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    status: "draft",
    notes: "",
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): InvoiceFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        subject: d.subject || "",
        customer: toRelation(d.customer_id, d.customer_name),
        vehicle: toRelation(d.vehicle_id, d.vehicle_name),
        department: toRelation(d.department_id, d.department_name),
        invoice_number: d.invoice_number || "",
        invoice_date: d.invoice_date || "",
        due_date: d.due_date || "",
        status: d.status || "draft",
        notes: d.notes || "",
    }
}

function mapFormToPayload(values: InvoiceFormValues) {
    return {
        subject: values.subject,
        customer_id: toId(values.customer),
        vehicle_id: toId(values.vehicle),
        department_id: toId(values.department),
        invoice_number: values.invoice_number || undefined,
        invoice_date: values.invoice_date || undefined,
        due_date: values.due_date || undefined,
        status: values.status || undefined,
        notes: values.notes || undefined,
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

export function InvoiceForm({ resourceId, initialData, onSuccess }: InvoiceFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<InvoiceFormValues, any>({
        schema: invoiceFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        queryKey: [INVOICE_ROUTES.BY_ID, resourceId],
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: InvoiceFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = (isEditing && resourceId
                ? api.invoices.update(resourceId, payload)
                : api.invoices.create(payload)) as Promise<any>
            toast.promise(promise, {
                loading: isEditing ? "Updating invoice..." : "Creating invoice...",
                success: isEditing ? "Invoice updated successfully" : "Invoice created successfully",
                error: isEditing ? "Failed to update invoice" : "Failed to create invoice",
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
                        {isEditing ? "Failed to update invoice" : "Failed to create invoice"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField name="subject" label="Subject" placeholder="Invoice subject" required />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="invoice_number" label="Invoice Number" placeholder="INV-0001" />
                    <RhfSelectField
                        name="status"
                        label="Status"
                        placeholder="Select status"
                        options={STATUS_OPTIONS}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="invoice_date" label="Invoice Date" type="date" />
                    <RhfTextField name="due_date" label="Due Date" type="date" />
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

                <RhfAsyncSelectField
                    name="department"
                    label="Department"
                    placeholder="Select department"
                    queryKey={[DEPARTMENT_ROUTES.INDEX]}
                    listFn={() => api.departments.list()}
                    mapOption={mapLookupOption}
                    {...STORE_OBJECT}
                />

                <RhfTextareaField name="notes" label="Notes" placeholder="Additional notes" rows={3} />

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Invoice" : "Create Invoice")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
