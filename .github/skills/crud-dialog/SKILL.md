---
name: crud-dialog
description: "Create CRUD dialogs for managing lookup/reference resources inline (inside a dialog) rather than a full page. Use when: adding a config/manage button next to a select field, building an inline CRUD for a simple lookup entity (e.g. insurance types, payment terms, categories), embedding list+create+edit+delete inside a modal. Uses the shared CrudDialog component and useCrudDialog hook."
---

# CRUD Dialog Generator

Create fully functional CRUD dialogs that embed list + create + edit + delete inside a modal dialog. This is the in-dialog counterpart of the page-level `ResourcePage` pattern. Ideal for managing simple lookup/reference entities without navigating away from the current form.

## When to Use

- User wants a config/settings button next to a select field to manage its options
- User wants to manage a simple lookup entity (e.g. insurance types, categories, tags) inline
- The resource is simple enough that a full page is overkill
- User says "CRUD in a dialog", "manage inside a modal", "config button", "inline CRUD"

## When NOT to Use

- The resource is complex with many fields, relations, or tabs → use **crud-page** skill instead
- The resource already has a dedicated page → link to it instead
- Only creation is needed (no listing/editing) → use `RhfAsyncSelectField` with `createForm` prop instead

## Architecture

The CRUD Dialog system has two layers:

| Layer | File | Purpose |
|-------|------|---------|
| **Hook** | `shared/components/crud-dialog/use-crud-dialog.ts` | Local state for pagination, sorting, form open/close, delete confirmation. No URL pollution. |
| **Component** | `shared/components/crud-dialog/crud-dialog.tsx` | Renders trigger button → Dialog with DataTable (list view) ↔ Form (create/edit view). Uses `useCrudDialog` internally. |

### Key Differences from ResourcePage

| Aspect | ResourcePage | CrudDialog |
|--------|-------------|------------|
| Renders in | Full page | Dialog modal |
| Pagination state | URL query params (`nuqs`) | Local `useState` (no URL pollution) |
| Form rendering | `FormDialog` component | Inline view swap (list ↔ form) |
| Trigger | Page navigation | Button click (settings icon by default) |
| Use case | Primary resource management | Lookup/reference entity management |

## Procedure

### Step 1: Ensure API Client Exists

The resource needs a client with `list`, `create`, `update`, `destroy` methods. Check `packages/api/src/clients/`. If missing, create one following the **crud-page** skill's Step 2.

### Step 2: Create the Resource Form

Create a simple form component for the resource. This is a lightweight form (no `useResourceForm` needed for simple entities).

**File**: `apps/dashboard/modules/<parent-module>/<resource>-form.tsx`

**Template**:

```tsx
"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Save } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { Rhform, RhfTextField } from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useEffect } from "react"

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    // Add more fields as needed
})

type FormValues = z.infer<typeof schema>

type Props = {
    resourceId?: string | null
    initialData?: any
    onSuccess?: () => void
}

export function <Resource>Form({ resourceId, initialData, onSuccess }: Props) {
    const api = useAuthApi()
    const isEditing = !!resourceId

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: "" },
    })

    // Pre-fill when editing
    useEffect(() => {
        if (initialData) {
            const d = initialData?.data ?? initialData
            form.reset({ name: d.name ?? "" })
        }
    }, [initialData, form])

    const handleSubmit = async (values: FormValues) => {
        try {
            const promise = isEditing
                ? api.<resource>.update(resourceId!, { title: values.name } as any)
                : api.<resource>.create({ title: values.name } as any)

            toast.promise(promise, {
                loading: isEditing ? "Updating..." : "Creating...",
                success: isEditing ? "Updated successfully" : "Created successfully",
                error: isEditing ? "Failed to update" : "Failed to create",
            })

            await promise
            form.reset()
            onSuccess?.()
        } catch {
            // toast already shown
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextField name="name" label="Name" placeholder="e.g. My Item" required />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {form.formState.isSubmitting
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update" : "Create")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
```

### Step 3: Create the CrudDialog Instance

Wire the form into a `CrudDialog` component.

**File**: `apps/dashboard/modules/<parent-module>/<resource>-crud-dialog.tsx`

**Template**:

```tsx
"use client"

import { CrudDialog } from "@/shared/components/crud-dialog"
import { ColumnHeader } from "@/shared/data-view/table-view"
import { useAuthApi } from "@/shared/useApi"
import { <RESOURCE>_ROUTES } from "@garage/api"
import { <Resource>Form } from "./<resource>-form"

export function <Resource>CrudDialog() {
    const api = useAuthApi()

    return (
        <CrudDialog
            title="<Resource Label>"
            queryKey={[<RESOURCE>_ROUTES.INDEX]}
            getClient={() => api.<resource>}
            resourceLabel="<resource label>"
            columns={() => [
                {
                    accessorKey: "name",
                    header: ({ column }) => <ColumnHeader column={column} title="Name" />,
                },
                // Add more columns as needed
            ]}
            renderForm={({ resourceId, initialData, onSuccess }) => (
                <<Resource>Form
                    resourceId={resourceId}
                    initialData={initialData}
                    onSuccess={onSuccess}
                />
            )}
        />
    )
}
```

### Step 4: Wire into the Parent Form

Place the CrudDialog trigger next to the corresponding select field. The pattern is to add a custom label row with the config button:

```tsx
import { <Resource>CrudDialog } from "./<resource>-crud-dialog"

// Inside the form JSX:
<div>
    <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium"><Field Label></span>
        <<Resource>CrudDialog />
    </div>
    <RhfAsyncSelectField
        name="<field_name>"
        label=""
        placeholder="Select..."
        queryKey={[<RESOURCE>_ROUTES.INDEX]}
        listFn={() => api.<resource>.list()}
        mapOption={mapLookupOption}
        {...STORE_OBJECT}
    />
</div>
```

**Key**: Set `label=""` on the `RhfAsyncSelectField` since the label is rendered manually above with the config button.

## CrudDialog Props Reference

```typescript
type CrudDialogProps<TClient> = {
    /** Dialog title shown in the header */
    title: string
    /** React Query cache key */
    queryKey: string[]
    /** Function returning the API client instance */
    getClient: () => TClient
    /** Human-readable name for toast messages (e.g. "insurance type") */
    resourceLabel?: string
    /** Table columns definition */
    columns: (helpers: {
        openEdit: (row: any) => void
        handleDelete: (row: any) => Promise<void>
    }) => ColumnDef<any>[]
    /** Render create/edit form */
    renderForm: (props: {
        resourceId: string | null
        initialData: any
        onSuccess: () => void
    }) => React.ReactNode
    /** Optional custom trigger element (defaults to Settings2 icon) */
    trigger?: React.ReactNode
    /** CSS class for the default trigger button */
    triggerClassName?: string
}
```

## useCrudDialog Hook API

For advanced use cases where you need more control, use the hook directly:

```typescript
const crud = useCrudDialog({
    queryKey: [ROUTES.INDEX],
    getClient: () => api.resource,
    resourceLabel: "item",
})

// Returns:
crud.items          // Current page data
crud.isLoading      // Query loading state
crud.pagination     // { page, pageSize, pageCount, total }
crud.sorting        // SortingState
crud.handleChange   // DataViewChangeEvent handler
crud.isFormOpen     // Whether form view is active
crud.editingId      // ID being edited (null for create)
crud.editingItem    // Full item data being edited
crud.openCreate()   // Switch to create form
crud.openEdit(row)  // Switch to edit form
crud.closeForm()    // Back to list view
crud.handleDelete(row) // Confirm + delete
crud.handleFormSuccess() // Invalidate + close form
crud.invalidateQuery()  // Refresh list data
```

## Real Example: Insurance Type

See the implementation in `apps/dashboard/modules/job-cards/`:

- [insurance-type-form.tsx](../../apps/dashboard/modules/job-cards/insurance-type-form.tsx) — Simple form with one "name" field
- [insurance-type-crud-dialog.tsx](../../apps/dashboard/modules/job-cards/insurance-type-crud-dialog.tsx) — CrudDialog wiring
- [job-card-form.tsx](../../apps/dashboard/modules/job-cards/job-card-form.tsx) — Usage next to the insurance type select field

## Naming Conventions

| Item | Pattern | Example |
|------|---------|---------|
| Form file | `modules/<parent>/<resource>-form.tsx` | `job-cards/insurance-type-form.tsx` |
| CrudDialog file | `modules/<parent>/<resource>-crud-dialog.tsx` | `job-cards/insurance-type-crud-dialog.tsx` |
| Form component | `<Resource>Form` | `InsuranceTypeForm` |
| CrudDialog component | `<Resource>CrudDialog` | `InsuranceTypeCrudDialog` |

## Imports Cheat Sheet

```tsx
// CrudDialog component
import { CrudDialog } from "@/shared/components/crud-dialog"

// Table column header
import { ColumnHeader } from "@/shared/data-view/table-view"

// API
import { useAuthApi } from "@/shared/useApi"
import { <RESOURCE>_ROUTES } from "@garage/api"

// Form components (for the resource form)
import { Rhform, RhfTextField } from "@/shared/components/form"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
```
