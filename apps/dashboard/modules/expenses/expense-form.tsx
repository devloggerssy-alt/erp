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
    RhfTextareaField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"

import {
    expenseFormSchema,
    type ExpenseFormValues,
} from "./expense.schema"
import { EXPENSE_ROUTES, JOB_CARD_ROUTES, VENDOR_ROUTES, DEPARTMENT_ROUTES } from "@garage/api"

// ── Constants ──

const STATUS_OPTIONS = [
    { value: "open", label: "Open" },
    { value: "paid", label: "Paid" },
]

// ── Props ──

export type ExpenseFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: ExpenseFormValues = {
    job_card: null,
    category: null,
    vendor: null,
    department: null,
    title: "",
    invoice_number: "",
    expense_date: "",
    notes: "",
    status: "open",
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): ExpenseFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        job_card: toRelation(d.job_card_id, d.job_card_name),
        category: toRelation(d.category_id, d.category_name),
        vendor: toRelation(d.vendor_id, d.vendor_name),
        department: toRelation(d.department_id, d.department_name),
        title: d.title || "",
        invoice_number: d.invoice_number || "",
        expense_date: d.expense_date || "",
        notes: d.notes || "",
        status: d.status || "open",
    }
}

function mapFormToPayload(values: ExpenseFormValues) {
    return {
        job_card_id: toId(values.job_card),
        category_id: toId(values.category),
        vendor_id: toId(values.vendor),
        department_id: toId(values.department),
        title: values.title,
        invoice_number: values.invoice_number || undefined,
        expense_date: values.expense_date || undefined,
        notes: values.notes || undefined,
        status: values.status || undefined,
    }
}

// ── Shared mapOption for async selects ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name,
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

// ── Component ──

export function ExpenseForm({ resourceId, initialData, onSuccess }: ExpenseFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<ExpenseFormValues, any>({
        schema: expenseFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: ExpenseFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.expenses.update(resourceId, payload)
                : api.expenses.create(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating expense..." : "Creating expense...",
                success: isEditing ? "Expense updated successfully" : "Expense created successfully",
                error: isEditing ? "Failed to update expense" : "Failed to create expense",
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
                        {isEditing ? "Failed to update expense" : "Failed to create expense"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField name="title" label="Title" placeholder="Enter expense title" required />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfSelectField
                        name="status"
                        label="Status"
                        placeholder="Select status"
                        options={STATUS_OPTIONS}
                    />
                    <RhfTextField name="expense_date" label="Expense Date" placeholder="YYYY-MM-DD" type="date" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="vendor"
                        label="Vendor"
                        placeholder="Select vendor"
                        queryKey={[VENDOR_ROUTES.INDEX]}
                        listFn={() => api.vendors.list()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="department"
                        label="Department"
                        placeholder="Select department"
                        queryKey={[DEPARTMENT_ROUTES.INDEX]}
                        listFn={() => api.departments.list()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="job_card"
                        label="Job Card"
                        placeholder="Select job card"
                        queryKey={[JOB_CARD_ROUTES.INDEX]}
                        listFn={() => api.jobCards.list()}
                        mapOption={(item: any) => ({ value: String(item.id), label: item.job_card_number || item.name || `#${item.id}` })}
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="category"
                        label="Category"
                        placeholder="Select category"
                        queryKey={[EXPENSE_ROUTES.ITEMS]}
                        listFn={() => api.expenses.listItems()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                </div>

                <RhfTextField name="invoice_number" label="Invoice Number" placeholder="INV-001" />

                <RhfTextareaField name="notes" label="Notes" rows={3} />

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Expense" : "Create Expense")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
