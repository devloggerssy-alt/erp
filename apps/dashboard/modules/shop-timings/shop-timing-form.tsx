"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
    RhfCheckboxField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"

import {
    shopTimingFormSchema,
    type ShopTimingFormValues,
} from "./shop-timing.schema"
import { SHOP_TIMING_ROUTES } from "@garage/api"

// ── Props ──

export type ShopTimingFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: ShopTimingFormValues = {
    title: "",
    in_time: "",
    out_time: "",
    full_day_hours: "",
    half_day_hours: "",
    punch_in: "",
    punch_out: "",
    before_time: "",
    after_time: "",
    is_default: false,
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): ShopTimingFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        title: d.title ?? "",
        in_time: d.in_time ?? "",
        out_time: d.out_time ?? "",
        full_day_hours: d.full_day_hours ?? "",
        half_day_hours: d.half_day_hours ?? "",
        punch_in: d.punch_in ?? "",
        punch_out: d.punch_out ?? "",
        before_time: d.before_time ?? "",
        after_time: d.after_time ?? "",
        is_default: d.is_default ?? false,
    }
}

function mapFormToPayload(values: ShopTimingFormValues) {
    return {
        title: values.title,
        in_time: values.in_time,
        out_time: values.out_time,
        full_day_hours: values.full_day_hours || undefined,
        half_day_hours: values.half_day_hours || undefined,
        punch_in: values.punch_in || undefined,
        punch_out: values.punch_out || undefined,
        before_time: values.before_time || undefined,
        after_time: values.after_time || undefined,
        is_default: values.is_default,
    }
}

// ── Component ──

export function ShopTimingForm({ resourceId, initialData, onSuccess }: ShopTimingFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<ShopTimingFormValues, any>({
        schema: shopTimingFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        initialize: (id) => api.shopTimings.show(id),
        queryKey: [SHOP_TIMING_ROUTES.BY_ID, resourceId],
        mapToFormValues: mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: ShopTimingFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.shopTimings.update(resourceId, payload)
                : api.shopTimings.create(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating shop timing..." : "Creating shop timing...",
                success: isEditing ? "Shop timing updated successfully" : "Shop timing created successfully",
                error: isEditing ? "Failed to update shop timing" : "Failed to create shop timing",
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
                        {isEditing ? "Failed to update shop timing" : "Failed to create shop timing"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField name="title" label="Title" placeholder="Enter title" required />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="in_time" label="In Time" placeholder="HH:MM:SS" required />
                    <RhfTextField name="out_time" label="Out Time" placeholder="HH:MM:SS" required />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="full_day_hours" label="Full Day Hours" placeholder="HH:MM:SS" />
                    <RhfTextField name="half_day_hours" label="Half Day Hours" placeholder="HH:MM:SS" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="punch_in" label="Punch In" placeholder="HH:MM:SS" />
                    <RhfTextField name="punch_out" label="Punch Out" placeholder="HH:MM:SS" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="before_time" label="Before Time" placeholder="HH:MM:SS" />
                    <RhfTextField name="after_time" label="After Time" placeholder="HH:MM:SS" />
                </div>

                <RhfCheckboxField name="is_default" label="Set as default" />

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Shop Timing" : "Create Shop Timing")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
