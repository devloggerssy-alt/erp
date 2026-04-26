"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"

import {
    vendorFormSchema,
    type VendorFormValues,
} from "./vendor.schema"
import { VENDOR_ROUTES } from "@garage/api"

// ── Props ──

export type VendorFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: VendorFormValues = {
    first_name: "",
    last_name: "",
    company_name: "",
    email: "",
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): VendorFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        first_name: d.first_name || "",
        last_name: d.last_name || "",
        company_name: d.company_name || "",
        email: d.email || "",
    }
}

function mapFormToPayload(values: VendorFormValues) {
    return {
        first_name: values.first_name,
        last_name: values.last_name || undefined,
        company_name: values.company_name || undefined,
        email: values.email || undefined,
    }
}

// ── Component ──

export function VendorForm({ resourceId, initialData, onSuccess }: VendorFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<VendorFormValues, any>({
        schema: vendorFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: VendorFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.vendors.update(resourceId, payload)
                : api.vendors.create(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating vendor..." : "Creating vendor...",
                success: isEditing ? "Vendor updated successfully" : "Vendor created successfully",
                error: isEditing ? "Failed to update vendor" : "Failed to create vendor",
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
                        {isEditing ? "Failed to update vendor" : "Failed to create vendor"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="first_name" label="First Name" placeholder="John" required />
                    <RhfTextField name="last_name" label="Last Name" placeholder="Doe" />
                </div>

                <RhfTextField name="company_name" label="Company Name" placeholder="Acme Supplies" />
                <RhfTextField name="email" label="Email" placeholder="vendor@example.com" type="email" />

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Vendor" : "Create Vendor")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
