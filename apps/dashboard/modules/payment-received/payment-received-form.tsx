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
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"

import {
    paymentReceivedFormSchema,
    type PaymentReceivedFormValues,
} from "./payment-received.schema"
import { PAYMENT_ROUTES, CUSTOMER_ROUTES, JOB_CARD_ROUTES } from "@garage/api"

// ── Props ──

export type PaymentReceivedFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: PaymentReceivedFormValues = {
    job_card: null,
    payment_mode: null,
    customer: null,
    amount_received: "",
    payment_number: "",
    payment_date: "",
    note: "",
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): PaymentReceivedFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        job_card: toRelation(d.job_card_id, d.job_card_name),
        payment_mode: toRelation(d.payment_mode_id, d.payment_mode_name),
        customer: toRelation(d.customer_id, d.customer_name),
        amount_received: d.amount_received ? String(d.amount_received) : "",
        payment_number: d.payment_number || "",
        payment_date: d.payment_date || "",
        note: d.note || "",
    }
}

function mapFormToPayload(values: PaymentReceivedFormValues) {
    return {
        job_card_id: toId(values.job_card),
        payment_mode_id: toId(values.payment_mode),
        customer_id: toId(values.customer),
        amount_received: values.amount_received,
        payment_number: values.payment_number || undefined,
        payment_date: values.payment_date,
        note: values.note || undefined,
    }
}

// ── Shared mapOption for async selects ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name || item.title,
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

// ── Component ──

export function PaymentReceivedForm({ resourceId, initialData, onSuccess }: PaymentReceivedFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<PaymentReceivedFormValues, any>({
        schema: paymentReceivedFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: PaymentReceivedFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.payments.updateReceived(resourceId, payload as any)
                : api.payments.createReceived(payload as any)
            toast.promise(promise, {
                loading: isEditing ? "Updating payment..." : "Recording payment...",
                success: isEditing ? "Payment updated successfully" : "Payment recorded successfully",
                error: isEditing ? "Failed to update payment" : "Failed to record payment",
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
                        {isEditing ? "Failed to update payment" : "Failed to record payment"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="customer"
                        label="Customer"
                        placeholder="Select customer"
                        queryKey={[CUSTOMER_ROUTES.INDEX]}
                        listFn={() => api.customers.list()}
                        mapOption={(item: any) => ({
                            value: String(item.id),
                            label: item.first_name
                                ? `${item.first_name} ${item.last_name || ""}`.trim()
                                : item.name || `#${item.id}`,
                        })}
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="job_card"
                        label="Job Card"
                        placeholder="Select job card"
                        queryKey={[JOB_CARD_ROUTES.INDEX]}
                        listFn={() => api.jobCards.list()}
                        mapOption={(item: any) => ({
                            value: String(item.id),
                            label: item.job_card_number || item.name || `#${item.id}`,
                        })}
                        {...STORE_OBJECT}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField
                        name="amount_received"
                        label="Amount Received"
                        placeholder="0.00"
                        type="number"
                        required
                    />
                    <RhfAsyncSelectField
                        name="payment_mode"
                        label="Payment Mode"
                        placeholder="Select payment mode"
                        queryKey={[PAYMENT_ROUTES.MODES]}
                        listFn={() => api.payments.listModes()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField
                        name="payment_number"
                        label="Payment Number"
                        placeholder="PAY-001"
                    />
                    <RhfTextField
                        name="payment_date"
                        label="Payment Date"
                        type="date"
                        required
                    />
                </div>

                <RhfTextareaField name="note" label="Note" rows={3} placeholder="Add any notes about this payment..." />

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Recording...")
                        : (isEditing ? "Update Payment" : "Record Payment")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
