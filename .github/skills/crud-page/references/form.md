# Form Reference

## File Location

`apps/dashboard/modules/<feature>/<feature>-form.tsx`

## Complete Template

```tsx
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
    // RhfTextareaField,
    // RhfCheckboxField,
    // RhfAsyncMultiSelectField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"

import {
    <feature>FormSchema,
    type <Feature>FormValues,
} from "./<feature>.schema"
import { <RESOURCE>_ROUTES } from "@garage/api"

// ── Constants ──

// ALWAYS derive select options from API enums imported from "@garage/api".
// NEVER hardcode enum values inline — they must stay in sync with the backend.
//
// Pattern: import the enum array, then .map() to produce { value, label } pairs.
//
// const STATUS_OPTIONS = SomeStatus.map((v) => ({
//     value: v,
//     label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
// }))
//
// If no matching enum exists in packages/api/src/contracts/enums.ts, add it there first,
// then import and use it here.

// ── Props ──

export type <Feature>FormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: <Feature>FormValues = {
    // Match every field in the Zod schema:
    // name: "",
    // email: "",
    // category: null,         // relation fields default to null
    // is_active: true,        // booleans
}

// ── Mapping helpers ──

function mapToFormValues(data: unknown): <Feature>FormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        // String fields:
        // name: d.name || "",
        // email: d.email || "",

        // Relation fields (API returns id + name separately):
        // category: toRelation(d.category_id, d.category_name),

        // Booleans:
        // is_active: d.is_active ?? true,
    }
}

function mapFormToPayload(values: <Feature>FormValues) {
    return {
        // String fields — use `|| undefined` to send null for empty strings:
        // name: values.name,
        // email: values.email || undefined,

        // Relation fields — extract the numeric ID:
        // category_id: toId(values.category),

        // Booleans:
        // is_active: values.is_active,
    }
}

// ── Shared mapOption for async selects ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name,
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

// ── Component ──

export function <Feature>Form({ resourceId, initialData, onSuccess }: <Feature>FormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<<Feature>FormValues, any>({
        schema: <feature>FormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        initialize: (id) => api.<camelResource>.show(id),
        queryKey: [<RESOURCE>_ROUTES.BY_ID, resourceId],
        mapToFormValues: mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: <Feature>FormValues) => {
            const payload = mapFormToPayload(values)
            const promise = isEditing && resourceId
                ? api.<camelResource>.update(resourceId, payload)
                : api.<camelResource>.create(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating <resource>..." : "Creating <resource>...",
                success: isEditing ? "<Resource> updated successfully" : "<Resource> created successfully",
                error: isEditing ? "Failed to update <resource>" : "Failed to create <resource>",
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
                        {isEditing ? "Failed to update <resource>" : "Failed to create <resource>"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                {/* Text fields */}
                {/* <RhfTextField name="name" label="Name" placeholder="Enter name" required /> */}

                {/* Grid layout for side-by-side fields */}
                {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="email" label="Email" type="email" />
                    <RhfTextField name="phone" label="Phone" type="tel" />
                </div> */}

                {/* Static select */}
                {/* <RhfSelectField
                    name="status"
                    label="Status"
                    placeholder="Select status"
                    options={STATUS_OPTIONS}
                /> */}

                {/* Async select (fetches options from API) */}
                {/* <RhfAsyncSelectField
                    name="category"
                    label="Category"
                    placeholder="Select category"
                    queryKey={["categories"]}
                    listFn={() => api.categories.list()}
                    mapOption={mapLookupOption}
                    {...STORE_OBJECT}
                /> */}

                {/* Textarea */}
                {/* <RhfTextareaField name="notes" label="Notes" rows={4} /> */}

                {/* Checkbox */}
                {/* <RhfCheckboxField name="is_active" label="Active" /> */}

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update <Resource>" : "Create <Resource>")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
```

## Key Patterns

### mapToFormValues

Transforms API response → form values. Always handle:
- Null safety: `d.field || ""`
- Relation fields: `toRelation(d.relation_id, d.relation_name)`
- Nested data: `(data as any)?.data ?? data ?? {}`
- Booleans: `d.field ?? defaultValue`

### mapFormToPayload

Transforms form values → API request body. Always handle:
- Empty strings to undefined: `values.field || undefined`
- Relation to ID: `toId(values.relation)`
- Keep required fields as-is: `values.name`

### useResourceForm

Initializes react-hook-form with Zod validation. Handles both create and edit modes:
- `resourceId` null → create mode (uses `defaultValues`)
- `resourceId` set → edit mode (fetches via `initialize`, maps with `mapToFormValues`)

### useFormMutation

Wraps `useMutation` with automatic Laravel validation error mapping to form fields. No need to manually handle `ApiError.validationErrors`.

### Toast Pattern

Always use `toast.promise()` wrapping the API call for consistent loading/success/error feedback.

## Layout Conventions

- Use `<FieldGroup>` to wrap all fields
- Use `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">` for side-by-side fields
- Place the submit button at the bottom inside `<FieldGroup>`
- Show error alert above fields when mutation fails
