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
    RhfCheckboxField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"

import {
    employeeFormSchema,
    type EmployeeFormValues,
} from "./employee.schema"
import { EMPLOYEE_ROUTES, DEPARTMENT_ROUTES, SHOP_TIMING_ROUTES, SHOP_CALENDAR_ROUTES } from "@devloggers/api-client"

// ── Constants ──

const STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
]

const TYPE_OPTIONS = [
    { value: "employee", label: "Employee" },
    { value: "contractor", label: "Contractor" },
]

// ── Props ──

export type EmployeeFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: EmployeeFormValues = {
    department: null,
    shop_calender: null,
    shop_timing: null,
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    status: "active",
    type: "employee",
    track_attendance: true,
    notify_owner_when_punch_in_out: false,
    geo_fence_radius: 100,
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): EmployeeFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        department: toRelation(d.department_id, d.department?.name),
        shop_calender: toRelation(d.shop_calender_id, d.shop_calender?.title),
        shop_timing: toRelation(d.shop_timing_id, d.shop_timing?.title),
        first_name: d.first_name || "",
        last_name: d.last_name || "",
        email: d.email || "",
        phone: d.phone || "",
        position: d.position || "",
        status: d.status || "active",
        type: d.type || "employee",
        track_attendance: d.track_attendance ?? true,
        notify_owner_when_punch_in_out: d.notify_owner_when_punch_in_out ?? false,
        geo_fence_radius: d.geo_fence_radius ?? 100,
    }
}

function mapFormToPayload(values: EmployeeFormValues) {
    return {
        department_id: toId(values.department),
        shop_calender_id: toId(values.shop_calender),
        shop_timing_id: toId(values.shop_timing),
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        position: values.position || undefined,
        status: values.status || undefined,
        type: values.type || undefined,
        track_attendance: values.track_attendance,
        notify_owner_when_punch_in_out: values.notify_owner_when_punch_in_out,
        geo_fence_radius: values.geo_fence_radius,
    }
}

// ── Shared mapOption for async selects ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name ?? item.title ?? String(item.id),
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

// ── Component ──

export function EmployeeForm({ resourceId, initialData, onSuccess }: EmployeeFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<EmployeeFormValues, any>({
        schema: employeeFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        initialize: (id) => api.employees.show(id),
        queryKey: [EMPLOYEE_ROUTES.BY_ID, resourceId],
        mapToFormValues: mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: EmployeeFormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.employees.update(resourceId, payload)
                : api.employees.create(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating employee..." : "Creating employee...",
                success: isEditing ? "Employee updated successfully" : "Employee created successfully",
                error: isEditing ? "Failed to update employee" : "Failed to create employee",
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
                        {isEditing ? "Failed to update employee" : "Failed to create employee"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="first_name" label="First Name" placeholder="Jane" required />
                    <RhfTextField name="last_name" label="Last Name" placeholder="Smith" required />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="email" label="Email" placeholder="jane@example.com" type="email" />
                    <RhfTextField name="phone" label="Phone" placeholder="0501234567" type="tel" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="position" label="Position" placeholder="Technician" />
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
                    <RhfSelectField
                        name="status"
                        label="Status"
                        placeholder="Select status"
                        options={STATUS_OPTIONS}
                    />
                    <RhfSelectField
                        name="type"
                        label="Type"
                        placeholder="Select type"
                        options={TYPE_OPTIONS}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="shop_calender"
                        label="Shop Calendar"
                        placeholder="Select calendar"
                        queryKey={[SHOP_CALENDAR_ROUTES.INDEX]}
                        listFn={() => api.shopCalendars.list()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="shop_timing"
                        label="Shop Timing"
                        placeholder="Select timing"
                        queryKey={[SHOP_TIMING_ROUTES.INDEX]}
                        listFn={() => api.shopTimings.list()}
                        mapOption={mapLookupOption}
                        {...STORE_OBJECT}
                    />
                </div>

                <RhfTextField name="geo_fence_radius" label="Geo Fence Radius (m)" placeholder="100" type="number" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfCheckboxField name="track_attendance" label="Track Attendance" />
                    <RhfCheckboxField name="notify_owner_when_punch_in_out" label="Notify Owner on Punch In/Out" />
                </div>

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Employee" : "Create Employee")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
