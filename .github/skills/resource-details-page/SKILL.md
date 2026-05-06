---
name: resource-details-page
description: "Create resource details pages with tabbed layouts, context providers, and sub-pages for the carage-erp dashboard. Use when: building a details/show page for a resource, adding tabs to a resource detail view, creating a nested [id] layout, scaffolding sub-pages (owners, documents, estimates), implementing resource context providers, or adding actions menus to detail headers."
---

# Resource Details Page

Create fully structured resource details pages with tabbed navigation, shared context, and reusable sub-page patterns. This skill covers: layout → context provider → general-info component → actions component → tab sub-pages.

## When to Use

- User asks to create a details/show page for a resource (e.g. "create a customer details page")
- User asks to add tabs to a resource (e.g. "add an invoices tab to the vehicle page")
- User asks to scaffold a `[id]` layout with nested pages
- User wants sub-pages that share parent resource data (e.g. vehicle → estimates)
- User wants an actions dropdown (edit/delete) on a resource header

## Reference Implementation

The canonical implementation is the **vehicle details page** at:
```
app/(authenticated)/sales/vehicles/[id]/
├── layout.tsx          ← Server component: fetches resource, renders DashboardDetailsPage
├── page.tsx            ← Details tab: server component, read-only info display
├── owners/page.tsx     ← Sub-tab: client component, manual DataTable
├── documents/page.tsx  ← Sub-tab: client component, manual DataTable + upload
├── estimates/page.tsx  ← Sub-tab: client component, ResourcePage with extraParams
```

Module files at:
```
modules/vehicles/
├── vehicle.schema.ts
├── vehicle-form.tsx
├── vehicle-general-info.tsx   ← Read-only info cards for Details tab
├── vehicle-actions.tsx         ← Dropdown menu (Edit/Delete)
├── vehicle-context.tsx         ← React context for sharing resource data to sub-pages
└── vehicle-document-form.tsx   ← Document-specific form (optional)
```

## Procedure

### Step 1: Create the Resource Context

Create `modules/<resource>/<resource>-context.tsx`:

This context allows child tab pages to access the parent resource's identity (id + display label) without re-fetching. This is essential for sub-pages that create related records (e.g. creating an estimate pre-populated with the parent vehicle).

```tsx
"use client"

import { createContext, useContext } from "react"

type <Resource>ContextValue = {
    id: string
    label: string
}

const <Resource>Context = createContext<<Resource>ContextValue | null>(null)

export function <Resource>Provider({
    <resource>,
    children,
}: {
    <resource>: <Resource>ContextValue
    children: React.ReactNode
}) {
    return (
        <<Resource>Context.Provider value={<resource>}>
            {children}
        </<Resource>Context.Provider>
    )
}

export function use<Resource>() {
    return useContext(<Resource>Context)
}
```

**Key rules:**
- Always a `"use client"` component (context requires client React)
- Keep the context value minimal — only `id` and `label`
- `label` is a human-readable display string built from the resource's key fields
- The hook returns `null` when used outside the provider (no throw — graceful fallback)
- Do NOT store the full resource object — only identity data needed by sub-pages

### Step 2: Create the Actions Component

Create `modules/<resource>/<resource>-actions.tsx`:

This is a dropdown menu rendered in the `DashboardDetailsPage` header for resource-level actions.

```tsx
"use client"

import { useAuthApi } from "@/shared/useApi"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Ellipsis, Pencil, Trash2 } from "lucide-react"

type <Resource>ActionsProps = {
    <resource>Id: string
}

export function <Resource>Actions({ <resource>Id }: <Resource>ActionsProps) {
    const api = useAuthApi()
    const router = useRouter()

    const handleEdit = () => {
        router.push(`/<section>/<resources>/${<resource>Id}/edit`)
    }

    const handleDelete = async () => {
        await api.<resources>.destroy(<resource>Id)
        router.push("/<section>/<resources>")
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Ellipsis className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="size-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                    <Trash2 className="size-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
```

**Key rules:**
- Always a `"use client"` component
- Accepts `<resource>Id: string` as the only required prop
- Uses `useAuthApi()` for API calls, `useRouter()` for navigation
- `handleDelete` navigates back to the list page after deletion
- Add confirmation dialog for destructive actions when appropriate

### Step 3: Create the General Info Component

Create `modules/<resource>/<resource>-general-info.tsx`:

A read-only display component for the **Details tab** (the default `page.tsx`). Uses Card-based layout with icon-labeled fields.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"
// Import relevant icons from lucide-react

type <Resource>Data = {
    // Type all fields from the API response
    id?: number
    name?: string
    // ...
}

type <Resource>GeneralInfoProps = {
    <resource>: <Resource>Data
}

function InfoItem({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value?: string | null
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">
                    {value || <span className="text-muted-foreground">—</span>}
                </span>
            </div>
        </div>
    )
}

export function <Resource>GeneralInfo({ <resource> }: <Resource>GeneralInfoProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {/* Icon */} Section Title
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem icon={...} label="Field Name" value={<resource>.field} />
                        {/* More InfoItems */}
                    </div>
                </CardContent>
            </Card>
            {/* More Cards for other field groups */}
        </div>
    )
}
```

**Key rules:**
- This is a **server component** (no `"use client"`) — it receives data as props
- Group related fields into separate `Card` sections
- Use the `InfoItem` helper for consistent icon+label+value layout
- Show `"—"` dash for missing/null values
- Use `Badge` for status-like fields, `Separator` between groups

### Step 4: Create the Layout (Server Component)

Create `app/(authenticated)/<section>/<resources>/[id]/layout.tsx`:

This is the **central orchestrator** — it fetches the resource, renders the tabbed shell, and wraps children with the context provider.

```tsx
import { DashboardDetailsPage } from '@/base/components/layout/dashboard'
import { getServerApi } from '@garage/api/server'
import { <Resource>Actions } from '@/modules/<resources>/<resource>-actions'
import { <Resource>Provider } from '@/modules/<resources>/<resource>-context'
import React from 'react'

export default async function layout(props: {
    params: Promise<{ id: string }>
    children: React.ReactNode
}) {
    const { id } = await props.params
    const api = await getServerApi()
    const <resource> = await api.<resources>.getById(id)

    const title = /* Build display title from resource fields */ ''
    const <resource>Label = /* Build label for context, e.g. combining key fields */ ''

    return (
        <>
            <<Resource>Provider <resource>={{ id, label: <resource>Label || title }}>
                <DashboardDetailsPage
                    className="p-0 lg:p-0"
                    avatarSrc={<resource>.data?.image_url || ""}
                    title={title}
                    description={/* subtitle text */}
                    backHref="/<section>/<resources>"
                    actions={<<Resource>Actions <resource>Id={id} />}
                    tabs={[
                        { href: `/<section>/<resources>/${id}`, label: 'Details' },
                        { href: `/<section>/<resources>/${id}/<sub-tab>`, label: '<Sub Tab>' },
                        // More tabs...
                    ]}
                >
                    {props.children}
                </DashboardDetailsPage>
            </<Resource>Provider>
        </>
    )
}
```

**Key rules:**
- **Server component** (no `"use client"`) — uses `await` for data fetching
- Params are `Promise<{ id: string }>` in Next.js 15+ (use `await props.params`)
- Uses `getServerApi()` from `@garage/api/server` for server-side API calls
- `<Resource>Provider` wraps the entire `DashboardDetailsPage` so all tab children can access context
- `backHref` points to the resource list page
- `tabs[0].href` is always the base `/<section>/<resources>/${id}` (Details tab)
- `className="p-0 lg:p-0"` removes default padding — sub-pages handle their own spacing

**`DashboardDetailsPage` props:**

| Prop | Type | Purpose |
|---|---|---|
| `title` | `string` | Primary heading in the header |
| `description` | `string?` | Subtitle text below the title |
| `avatarSrc` | `string?` | Avatar image URL |
| `avatarFallback` | `string?` | Fallback text for avatar (e.g. initials) |
| `icon` | `ReactNode?` | Icon instead of avatar |
| `actions` | `ReactNode?` | Action buttons in header (right side) |
| `backHref` | `string?` | Back navigation URL |
| `tabs` | `{ href, label }[]?` | Route-based tab navigation |
| `className` | `string?` | Additional classes for content area |
| `children` | `ReactNode` | Active tab content (Next.js route children) |

### Step 5: Create the Details Tab (Default Page)

Create `app/(authenticated)/<section>/<resources>/[id]/page.tsx`:

```tsx
import { getServerApi } from '@garage/api/server'
import { <Resource>GeneralInfo } from '@/modules/<resources>/<resource>-general-info'
import DashboardPage from '@/base/components/layout/dashboard/dashboard-page'

export default async function page(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const api = await getServerApi()
    const <resource> = await api.<resources>.getById(id)

    if (!<resource>.data) {
        return <div className="text-muted-foreground"><Resource> not found.</div>
    }

    return (
        <DashboardPage header={null}>
            <<Resource>GeneralInfo <resource>={<resource>.data} />
        </DashboardPage>
    )
}
```

**Key rules:**
- **Server component** — fetches resource data on the server
- Uses `DashboardPage` wrapper with `header={null}` (the layout already has the header)
- Renders the general-info component with the full resource data
- Shows a fallback message if the resource is not found

### Step 6: Create Sub-Tab Pages

Choose the appropriate pattern based on the sub-tab's requirements:

#### Pattern A: ResourcePage with `extraParams` (Preferred for CRUD sub-tabs)

Use when the sub-tab needs full CRUD for a **related** resource filtered by the parent ID.

```tsx
"use client"

import { use } from "react"
import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import FormDialog from '@/shared/components/form-dialog'
import { <Related>Form } from '@/modules/<related>/<related>-form'
import { <RELATED>_ROUTES } from '@garage/api'
import type { <Related>Client } from '@garage/api'
import { use<Resource> } from '@/modules/<resource>/<resource>-context'

export default function <Resource><Related>Page({ params }: { params: Promise<{ id: string }> }) {
    const { id: <resource>Id } = use(params)
    const <resource> = use<Resource>()

    return (
        <ResourcePage<<Related>Client>
            toolbar={({ invalidateQuery, selectedItem, closeDialog }) => (
                <FormDialog title="<Related>">
                    {(resourceId) => (
                        <<Related>Form
                            resourceId={resourceId}
                            initialData={{
                                <resource>: <resource>
                                    ? { value: <resource>.id, label: <resource>.label }
                                    : null,
                            }}
                            onSuccess={() => {
                                closeDialog();
                                invalidateQuery();
                            }}
                        />
                    )}
                </FormDialog>
            )}
            pageTitle="<Resource> <Related>s"
            routeKey={<RELATED>_ROUTES.INDEX}
            getClient={(api) => api.<related>s}
            extraParams={{ <resource>_id: <resource>Id }}
            header={null}
            columns={({ actionsColumn }) => [
                // Column definitions...
                actionsColumn(),
            ]}
        />
    )
}
```

**Key rules:**
- `"use client"` — uses hooks (`use()`, `use<Resource>()`)
- Uses `use(params)` (React 19) to unwrap the params Promise
- Consumes the parent context via `use<Resource>()` to pre-populate the form's relation field
- `extraParams={{ <resource>_id: <resource>Id }}` filters the list to only show related records
- `header={null}` — the layout already provides the header
- Pass `initialData` with the parent resource as a relation field `{ value, label }`

#### Pattern B: Manual DataTable (For custom interactions)

Use when the sub-tab needs non-standard behavior (link/unlink, file uploads, custom mutations).

```tsx
"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthApi } from "@/shared/useApi"
import { DataTable, ColumnHeader } from "@/shared/data-view/table-view"
import DashboardPage from "@/base/components/layout/dashboard/dashboard-page"

export default function <Resource><Tab>Page() {
    const { id: <resource>Id } = useParams<{ id: string }>()
    const api = useAuthApi()
    const queryClient = useQueryClient()

    const queryKey = ["<resource>-<tab>", <resource>Id]

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => api.<resources>.get<Tab>(<resource>Id),
    })

    // Custom mutations (link, unlink, upload, etc.)

    return (
        <DashboardPage header={null}>
            <DataTable
                columns={columns}
                data={data?.data ?? []}
                isLoading={isLoading}
            />
        </DashboardPage>
    )
}
```

**Key rules:**
- Use `useParams()` or `use(params)` to get the parent resource ID
- Custom query key includes the parent resource ID
- Use `DashboardPage header={null}` as wrapper
- Implement custom mutations with `useMutation` + `useQueryClient` for cache invalidation

## API Integration

### Server-Side (Layout + Details Tab)

```tsx
import { getServerApi } from '@garage/api/server'

// In an async server component:
const api = await getServerApi()
const resource = await api.<resources>.getById(id)
```

- `getServerApi()` reads auth cookies server-side — no token passing needed
- Returns typed responses based on OpenAPI schema
- Used in `layout.tsx` and the default `page.tsx` (Details tab)

### Client-Side (Sub-Tab Pages)

```tsx
import { useAuthApi } from "@/shared/useApi"

// In a client component:
const api = useAuthApi()
// Then use with React Query:
useQuery({ queryFn: () => api.<resources>.list() })
```

- `useAuthApi()` returns the API client with the auth token from the store
- Always use with React Query (`useQuery`, `useMutation`) for caching and state management
- `ResourcePage` handles this internally — only needed for manual DataTable pages

### Client Types

API clients live in `packages/api/src/clients/<resource>.ts`. Each exports:
- `<RESOURCE>_ROUTES` — route constants (`INDEX`, `BY_ID`, etc.)
- `<Resource>Client` — class with typed methods

These are re-exported from `@garage/api` for use in the dashboard.

## Component Reusability

### Reusable Across Resources

| Component | Location | Reuse Pattern |
|---|---|---|
| `DashboardDetailsPage` | `@/base/components/layout/dashboard` | Used by every `[id]/layout.tsx` |
| `DashboardPage` | `@/base/components/layout/dashboard` | Used by every tab `page.tsx` with `header={null}` |
| `ResourcePage` | `@/shared/data-view/resource-page` | Used by CRUD sub-tabs with `extraParams` |
| `FormDialog` | `@/shared/components/form-dialog` | Used for create/edit dialogs in sub-tabs |
| `DataTable` | `@/shared/data-view/table-view` | Used for custom sub-tabs (non-CRUD) |
| `ColumnHeader` | `@/shared/data-view/table-view` | Used in all column definitions |
| `InfoItem` pattern | Copy per resource | Icon+label+value display for general-info |

### Resource-Specific (Create Per Resource)

| Component | Location | Purpose |
|---|---|---|
| `<resource>-context.tsx` | `modules/<resource>/` | Context provider for parent resource identity |
| `<resource>-actions.tsx` | `modules/<resource>/` | Header dropdown menu (edit/delete) |
| `<resource>-general-info.tsx` | `modules/<resource>/` | Read-only details display for Details tab |
| `<resource>-form.tsx` | `modules/<resource>/` | CRUD form (shared with list page creation) |
| `<resource>.schema.ts` | `modules/<resource>/` | Zod schema (shared with form) |

## File Structure Convention

```
app/(authenticated)/<section>/<resources>/[id]/
├── layout.tsx                  ← Server: fetch + DashboardDetailsPage + Provider
├── page.tsx                    ← Server: Details tab (GeneralInfo)
├── <sub-tab-1>/page.tsx        ← Client: ResourcePage or manual DataTable
├── <sub-tab-2>/page.tsx        ← Client: ResourcePage or manual DataTable
└── ...

modules/<resources>/
├── <resource>.schema.ts        ← Zod form schema
├── <resource>-form.tsx         ← CRUD form component
├── <resource>-context.tsx      ← Context provider (id + label)
├── <resource>-actions.tsx      ← Actions dropdown
├── <resource>-general-info.tsx ← Read-only info cards
└── <optional-sub-forms>/       ← e.g. document upload forms
```

## Naming Conventions

| Item | Pattern | Example |
|---|---|---|
| Layout file | `app/.../<resources>/[id]/layout.tsx` | `vehicles/[id]/layout.tsx` |
| Details page | `app/.../<resources>/[id]/page.tsx` | `vehicles/[id]/page.tsx` |
| Sub-tab page | `app/.../<resources>/[id]/<tab>/page.tsx` | `vehicles/[id]/estimates/page.tsx` |
| Context file | `modules/<resources>/<resource>-context.tsx` | `vehicles/vehicle-context.tsx` |
| Context type | `<Resource>ContextValue` | `VehicleContextValue` |
| Provider | `<Resource>Provider` | `VehicleProvider` |
| Hook | `use<Resource>()` | `useVehicle()` |
| Actions file | `modules/<resources>/<resource>-actions.tsx` | `vehicles/vehicle-actions.tsx` |
| Actions component | `<Resource>Actions` | `VehicleActions` |
| General info file | `modules/<resources>/<resource>-general-info.tsx` | `vehicles/vehicle-general-info.tsx` |
| General info component | `<Resource>GeneralInfo` | `VehicleGeneralInfo` |

## Imports Cheat Sheet

```tsx
// Layout
import { DashboardDetailsPage } from '@/base/components/layout/dashboard'
import { getServerApi } from '@garage/api/server'
import { <Resource>Actions } from '@/modules/<resources>/<resource>-actions'
import { <Resource>Provider } from '@/modules/<resources>/<resource>-context'

// Details tab
import { getServerApi } from '@garage/api/server'
import { <Resource>GeneralInfo } from '@/modules/<resources>/<resource>-general-info'
import DashboardPage from '@/base/components/layout/dashboard/dashboard-page'

// Sub-tab (ResourcePage pattern)
import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import FormDialog from '@/shared/components/form-dialog'
import { use<Resource> } from '@/modules/<resources>/<resource>-context'
import type { <Related>Client } from '@garage/api'
import { <RELATED>_ROUTES } from '@garage/api'

// Sub-tab (Manual DataTable pattern)
import { useAuthApi } from "@/shared/useApi"
import { DataTable, ColumnHeader } from "@/shared/data-view/table-view"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import DashboardPage from '@/base/components/layout/dashboard/dashboard-page'

// Context provider
import { createContext, useContext } from "react"

// Actions
import { useAuthApi } from "@/shared/useApi"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"

// General Info
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"
```
