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
    customerFormSchema,
    type CustomerFormValues,
} from "./customer.schema"
import { CUSTOMER_ROUTES } from "@devloggers/api-client"

// ── Constants ──

const SALUTATION_OPTIONS = [
    { value: "Mr.", label: "Mr." },
    { value: "Mrs.", label: "Mrs." },
    { value: "Ms.", label: "Ms." },
    { value: "Miss", label: "Miss" },
    { value: "Dr.", label: "Dr." },
    { value: "Prof.", label: "Prof." },
]

// ── Props ──

export type CustomerFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const CUSTOMER_DEFAULT_VALUES: CustomerFormValues = {
    customer_type: null,
    referral_source: null,
    payment_terms: null,
    country: null,
    state: null,
    salutation: "",
    first_name: "",
    last_name: "",
    company_name: "",
    email: "",
    phone: "",
    alternate_phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    zip_code: "",
}

// ── Mapping helpers ──

function mapCustomerToFormValues(data: unknown): CustomerFormValues {
    const c = (data as any)?.data ?? data ?? {}

    return {
        customer_type: toRelation(c.customer_type_id, c.customer_type_name),
        referral_source: toRelation(c.referral_source_id, c.referral_source_name),
        payment_terms: toRelation(c.payment_terms_id, c.payment_terms_name),
        country: toRelation(c.country_id, c.country_name),
        state: toRelation(c.state_id, c.state_name),
        salutation: c.salutation || "",
        first_name: c.first_name || "",
        last_name: c.last_name || "",
        company_name: c.company_name || "",
        email: c.email || "",
        phone: c.phone || "",
        alternate_phone: c.alternate_phone || "",
        address_line_1: c.address_line_1 || "",
        address_line_2: c.address_line_2 || "",
        city: c.city || "",
        zip_code: c.zip_code || "",
    }
}

function mapFormToPayload(values: CustomerFormValues) {
    return {
        customer_type_id: toId(values.customer_type),
        referral_source_id: toId(values.referral_source),
        payment_terms_id: toId(values.payment_terms),
        country_id: toId(values.country),
        state_id: toId(values.state),
        salutation: values.salutation || undefined,
        first_name: values.first_name,
        last_name: values.last_name,
        company_name: values.company_name || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        alternate_phone: values.alternate_phone || undefined,
        address_line_1: values.address_line_1 || undefined,
        address_line_2: values.address_line_2 || undefined,
        city: values.city || undefined,
        zip_code: values.zip_code || undefined,
    }
}

// ── Shared mapOption for async selects ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name,
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

// ── Component ──

export function CustomerForm({ resourceId, initialData, onSuccess }: CustomerFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<CustomerFormValues, any>({
        schema: customerFormSchema,
        defaultValues: CUSTOMER_DEFAULT_VALUES,
        resourceId,
        initialData,
        initialize: (id) => api.customers.show(id),
        queryKey: [CUSTOMER_ROUTES.BY_ID, resourceId],
        mapToFormValues: mapCustomerToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: CustomerFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.customers.update(resourceId, payload)
                : api.customers.create(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating customer..." : "Creating customer...",
                success: isEditing ? "Customer updated successfully" : "Customer created successfully",
                error: isEditing ? "Failed to update customer" : "Failed to create customer",
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
                    <AlertTitle>{isEditing ? "Failed to update customer" : "Failed to create customer"}</AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>

                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfSelectField
                        name="salutation"
                        label="Salutation"
                        placeholder="Select salutation"
                        options={SALUTATION_OPTIONS}
                    />
                    <RhfAsyncSelectField
                        name="customer_type"
                        label="Customer Type"
                        placeholder="Select customer type"
                        queryKey={[CUSTOMER_ROUTES.CUSTOMER_TYPES]}
                        listFn={() => api.customers.listCustomerTypes()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                </div>


                {/* Name */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="first_name" label="First Name" placeholder="John" required />
                    <RhfTextField name="last_name" label="Last Name" placeholder="Doe" required />
                </div>

                <RhfTextField name="company_name" label="Company Name" placeholder="Doe Holdings" />

                {/* Contact */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="email" label="Email" placeholder="john@example.com" type="email" />
                    <RhfTextField name="phone" label="Phone" placeholder="0501234567" type="tel" />
                </div>

                <RhfTextField name="alternate_phone" label="Alternate Phone" placeholder="0551234567" type="tel" />

                {/* Relations */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="referral_source"
                        label="Referral Source"
                        placeholder="Select referral source"
                        queryKey={["referral-sources"]}
                        listFn={() => api.referralSources.list()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="payment_terms"
                        label="Payment Terms"
                        placeholder="Select payment terms"
                        queryKey={["payment-terms"]}
                        listFn={() => api.paymentTerms.list()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                </div>

                {/* Address */}
                <RhfTextField name="address_line_1" label="Address Line 1" placeholder="Street 10" />
                <RhfTextField name="address_line_2" label="Address Line 2" placeholder="Near Central Plaza" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="country"
                        label="Country"
                        placeholder="Select country"
                        queryKey={["countries"]}
                        listFn={() => api.geo.countries()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="state"
                        label="State"
                        placeholder="Select state"
                        queryKey={["states"]}
                        listFn={() => api.geo.states()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="city" label="City" placeholder="Dubai" />
                    <RhfTextField name="zip_code" label="Zip Code" placeholder="00000" />
                </div>

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Customer" : "Create Customer")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}