---
name: resource-filters
description: "Add advanced filtering to resource list pages using a drawer/sheet with RHF forms and nuqs query params. Use when: adding filters to a ResourcePage, creating a filter drawer for any list page, implementing advanced search with URL-persisted filter state, adding query-param-based filtering to a CRUD page."
---

# Resource Filters

Add URL-persisted advanced filtering to any ResourcePage or data table list. Filters live in a right-side Sheet drawer, powered by React Hook Form (RHF) and synced to URL query params via nuqs.

## When to Use

- User asks to add filters or advanced filters to a list/index page
- User wants URL-shareable filter state on a resource page
- User asks to filter by relations, dates, or boolean flags on any data table
- User wants a filter drawer/dialog for any CRUD listing

## Architecture

```
┌─────────────────────────────────┐
│  useFilterParams (generic hook) │  ← Manages RHF form + nuqs URL sync
│  • schema + defaults            │
│  • paramsParsers (nuqs)         │
│  • mapParamsToFormValues        │
│  • mapFormValuesToParams        │
│  Returns: form, appliedParams,  │
│    open/close/submit/reset,     │
│    activeFilterCount            │
└──────────────┬──────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼───────┐   ┌────────▼──────────┐
│FilterDrawer│   │  ResourcePage     │
│(Sheet UI)  │   │  extraParams={    │
│            │   │   ...appliedParams│
│ <Fields /> │   │   ...quickFilters │
│ Apply/Reset│   │  }                │
└────────────┘   └───────────────────┘
```

## File Locations

| File | Purpose |
|---|---|
| `shared/hooks/use-filter-params.ts` | Generic hook — form + nuqs state sync |
| `shared/components/filter-drawer.tsx` | `FilterDrawer` sheet + `FilterTrigger` button |
| `modules/<feature>/<feature>-filters.tsx` | Feature-specific schema, parsers, mappers, fields |

## Procedure

### Step 1: Create the filter config file

Create `modules/<feature>/<feature>-filters.tsx` with:

1. **Zod schema** — all filter fields. Use `relationField` for foreign-key selects, `z.string().optional()` for dates, `z.boolean().optional()` for flags.
2. **Default values** — matching the schema (null for relations, `""` for strings, `false` for booleans).
3. **nuqs parsers** — `parseAsInteger` for relation IDs, `parseAsString` for dates/text, `parseAsBoolean` for flags.
4. **`mapParamsToFormValues`** — URL params → form values. Use `toRelation(id)` for relation fields.
5. **`mapFormValuesToParams`** — form values → URL params. Use `toId(relation)` for relation fields.
6. **Config export** — `UseFilterParamsOptions<T>` object with schema, defaults, parsers, mappers.
7. **Fields component** — renders RHF fields inside the drawer.

#### Template

```tsx
"use client"

import { z } from "zod"
import { parseAsInteger, parseAsString, parseAsBoolean } from "nuqs"
import { toRelation, toId, type RelationFieldValue } from "@/shared/lib/utils"
import {
    RhfAsyncSelectField,
    RhfDateField,
    RhfCheckboxField,
    RhfSelectField,
} from "@/shared/components/form"
import { useAuthApi } from "@/shared/useApi"
import { SOME_ROUTES } from "@garage/api"
import { Separator } from "@/shared/components/ui/separator"
import type { UseFilterParamsOptions } from "@/shared/hooks/use-filter-params"

// ── Schema ──

const relationField = z.object({ value: z.string(), label: z.string() }).nullable().optional()

const filterSchema = z.object({
    some_relation_id: relationField,
    some_date: z.string().optional(),
    some_flag: z.boolean().optional(),
})

type FilterValues = z.infer<typeof filterSchema>

// ── Defaults ──

const defaultValues: FilterValues = {
    some_relation_id: null,
    some_date: "",
    some_flag: false,
}

// ── nuqs Parsers ──

const paramsParsers = {
    some_relation_id: parseAsInteger,
    some_date: parseAsString,
    some_flag: parseAsBoolean,
}

// ── Mappers ──

function mapParamsToFormValues(params: Record<string, any>): Partial<FilterValues> {
    return {
        some_relation_id: params.some_relation_id ? toRelation(params.some_relation_id) : null,
        some_date: params.some_date ?? "",
        some_flag: params.some_flag ?? false,
    }
}

function mapFormValuesToParams(values: FilterValues): Record<string, any> {
    return {
        some_relation_id: toId(values.some_relation_id as RelationFieldValue) ?? null,
        some_date: values.some_date || null,
        some_flag: values.some_flag || null,
    }
}

// ── Filter Config ──

export const featureFilterConfig: UseFilterParamsOptions<FilterValues> = {
    schema: filterSchema,
    defaultValues,
    paramsParsers,
    mapParamsToFormValues,
    mapFormValuesToParams,
}

// ── Filter Fields Component ──

export function FeatureFilterFields() {
    const api = useAuthApi()

    return (
        <>
            <RhfAsyncSelectField
                name="some_relation_id"
                label="Some Relation"
                queryKey={[SOME_ROUTES.INDEX]}
                listFn={() => api.someResource.list( )}
                mapOption={(item: any) => ({ value: String(item.id), label: item.name })}
                placeholder="All"
            />

            <RhfDateField name="some_date" label="Some Date" />

            <RhfCheckboxField name="some_flag" label="Some Flag" />
        </>
    )
}
```

### Step 2: Integrate into the page

In the page component:

```tsx
import { useFilterParams } from '@/shared/hooks/use-filter-params'
import { FilterDrawer, FilterTrigger } from '@/shared/components/filter-drawer'
import { featureFilterConfig, FeatureFilterFields } from '@/modules/<feature>/<feature>-filters'

export default function FeaturePage() {
    const filter = useFilterParams(featureFilterConfig)

    // Combine drawer filters with any quick filters (tabs, search, etc.)
    const extraParams = useMemo(() => {
        const params: Record<string, unknown> = { ...filter.appliedParams }
        // Add quick filters if present
        if (search) params.search = search
        if (statusFilter !== "all") params.status = statusFilter
        return params
    }, [filter.appliedParams, search, statusFilter])

    return (
        <>
            <ResourcePage
                extraParams={extraParams}
                headerProps={({ ... }) => ({
                    title: "Feature",
                    actions: (
                        <div className="flex items-center gap-2">
                            <FilterTrigger
                                onClick={filter.open}
                                activeFilterCount={filter.activeFilterCount}
                            />
                            {/* other actions like FormDialog */}
                        </div>
                    ),
                })}
                {/* columns, tableHeader, etc. */}
            />

            <FilterDrawer
                form={filter.form}
                isOpen={filter.isOpen}
                onOpenChange={(open) => { if (!open) filter.close() }}
                onSubmit={filter.onSubmit}
                onReset={filter.reset}
                activeFilterCount={filter.activeFilterCount}
                title="Filter Features"
            >
                <FeatureFilterFields />
            </FilterDrawer>
        </>
    )
}
```

## Key Conventions

### Field Types

| Filter Type | Schema | nuqs Parser | Form Component | Default |
|---|---|---|---|---|
| Foreign key (select) | `relationField` (nullable object) | `parseAsInteger` | `RhfAsyncSelectField` | `null` |
| Date | `z.string().optional()` | `parseAsString` | `RhfDateField` | `""` |
| Boolean flag | `z.boolean().optional()` | `parseAsBoolean` | `RhfCheckboxField` | `false` |
| Enum select | `z.string().optional()` | `parseAsString` | `RhfSelectField` | `""` |
| Text/search | `z.string().optional()` | `parseAsString` | `RhfTextField` | `""` |
| Comma-separated IDs | `z.string().optional()` | `parseAsString` | custom / `RhfTextField` | `""` |

### Relation Field Mapping

- **URL → Form**: `toRelation(params.field_id)` produces `{ value: "5", label: "5" }`. The async select resolves the display label from loaded options.
- **Form → URL**: `toId(values.field_id)` extracts the numeric ID.
- Import `toRelation`, `toId`, and `RelationFieldValue` from `@/shared/lib/utils`.

### Section Grouping

Group related filters with `<Separator />` and section labels:
```tsx
<Separator />
<p className="text-sm font-medium text-muted-foreground pt-2">Section Name</p>
```

### Pagination Reset

The `useFilterParams` hook automatically resets the `page` query param to `1` when filters are applied or reset, preventing empty-page issues.

### Quick Filters vs Drawer Filters

- **Quick filters** (status tabs, search input) live directly in `tableHeader` and are managed via `useState` or separate nuqs params on the page.
- **Drawer filters** (advanced) are managed by `useFilterParams` and rendered inside `FilterDrawer`.
- Both are merged into `extraParams` with `useMemo`.

## Reference Implementation

See `modules/job-cards/job-card-filters.tsx` and `app/(authenticated)/sales/job-cards/page.tsx` for the complete working example.
