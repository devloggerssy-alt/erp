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
    RhfFileField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"

import { shopTypeFormSchema, type ShopTypeFormValues } from "./shop-type.schema"
import { SHOP_TYPE_ROUTES } from "@devloggers/api-client"

// ── Props ──

export type ShopTypeFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: ShopTypeFormValues = {
    title: "",
    shop_type: "",
    note: "",
    is_default: false,
    inspection: null,
    image: null,
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): ShopTypeFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        title: d.title || "",
        shop_type: d.shop_type || "",
        note: d.note || "",
        is_default: d.is_default ?? false,
        // File fields cannot be pre-filled from URL strings
        inspection: null,
        image: null,
    }
}

function mapFormToPayload(values: ShopTypeFormValues) {
    return {
        title: values.title,
        shop_type: values.shop_type || undefined,
        note: values.note || undefined,
        is_default: values.is_default,
        inspection: values.inspection ?? undefined,
        image: values.image ?? undefined,
    }
}

// ── Component ──

export function ShopTypeForm({ resourceId, initialData, onSuccess }: ShopTypeFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<ShopTypeFormValues, any>({
        schema: shopTypeFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: ShopTypeFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.shopTypes.update(resourceId, payload)
                : api.shopTypes.create({ ...payload, title: values.title })
            toast.promise(promise, {
                loading: isEditing ? "Updating shop type..." : "Creating shop type...",
                success: isEditing ? "Shop type updated successfully" : "Shop type created successfully",
                error: isEditing ? "Failed to update shop type" : "Failed to create shop type",
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
                        {isEditing ? "Failed to update shop type" : "Failed to create shop type"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField
                    name="title"
                    label="Title"
                    placeholder="e.g. Main Workshop"
                    required
                />
                <RhfTextField
                    name="shop_type"
                    label="Type"
                    placeholder="e.g. Car, Truck"
                />
                <RhfTextareaField
                    name="note"
                    label="Note"
                    placeholder="Optional description"
                    rows={3}
                />
                <RhfCheckboxField
                    name="is_default"
                    label="Set as default"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfFileField
                        name="inspection"
                        label="Inspection Template"
                        accept=".pdf,.doc,.docx"
                    />
                    <RhfFileField
                        name="image"
                        label="Image"
                        accept="image/*"
                    />
                </div>

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Shop Type" : "Create Shop Type")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
