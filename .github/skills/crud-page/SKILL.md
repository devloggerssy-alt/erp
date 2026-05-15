---
name: crud-page
description: "Create CRUD resource pages, forms, schemas, and API clients for the carage-erp dashboard. Use when: adding a new resource page, creating a CRUD feature, building a list/create/edit/delete page, scaffolding a new module, adding a new entity to the dashboard. Covers API client, Zod schema, form component, and page component creation."
---

# CRUD Page Generator

Create fully functional CRUD resource pages following the established codebase patterns. This skill covers the full stack: API client → Zod schema → form component → page component.

## When to Use

- User asks to create a new resource/entity page (e.g. "create a vendors page", "add invoices CRUD")
- User asks to add list/create/edit/delete functionality for a domain entity
- User asks to scaffold a new module or feature page
- User wants to extend the dashboard with a new data management page

## Decision: ResourcePage vs Manual DataTable

**Use `ResourcePage` (preferred)** when the resource needs full CRUD (list + create + edit + delete in a dialog). This is the standard pattern.

**Use manual `DataTable` + `useDataTableQuery`** only when the page is read-only or has highly custom layout needs.

Always prefer `ResourcePage` unless the user explicitly needs something different.

## Procedure

Follow these steps **in order**. Each step produces one file. Check the [reference files](./references/) for complete templates and patterns.

### Step 1: Check if API Client Exists

Look in `packages/api/src/clients/` for an existing client. Also check `packages/api/src/clients/index.ts` for all registered clients, and `packages/api/src/api.ts` for the factory.

- If client exists → skip to Step 3
- If client doesn't exist → continue to

### Step 2: Create API Client

Read the [API Client Reference](./references/api-client.md) for patterns and template.

Create the domain client file at `packages/api/src/clients/<resource>.ts`:

1. Define `RESOURCE_ROUTES` const with `INDEX` and `BY_ID` routes (and any extras)
2. Create a class extending `CrudClient` with the route types
3. Add any domain-specific methods beyond standard CRUD
4. Register in `packages/api/src/clients/index.ts` (export class + routes)
5. Register in `packages/api/src/api.ts` (import + add to `createApi()`)

**Route pattern**: `"/api/<plural-resource>"` for INDEX, `"/api/<plural-resource>/{id}"` for BY_ID.

**IMPORTANT**: Routes must exist in the OpenAPI schema (`packages/api/types/index.ts`) for type safety. If the route doesn't exist in the schema yet, inform the user and ask if they want to proceed with `any` types or wait for schema update.

### Step 3: Create Zod Schema

Read the [Schema Reference](./references/schema.md) for patterns and template.

Create `apps/dashboard/modules/<feature>/<feature>.schema.ts`:

1. Define `relationFieldSchema` (reuse if already exported) for foreign-key fields
2. Build the Zod object schema with all form fields
3. Use `.optional()` for non-required fields, `.min(1, "...")` for required strings
4. Use `z.union([z.string().email(...), z.literal("")]).optional()` for optional emails
5. Export the schema, the inferred type, and `relationFieldSchema` if new

### Step 4: Create Form Component

Read the [Form Reference](./references/form.md) for the complete template.

Create `apps/dashboard/modules/<feature>/<feature>-form.tsx`:

1. Define default values matching the schema
2. Create `mapToFormValues(data)` — transforms API shape → form shape using `toRelation()`
3. Create `mapFormToPayload(values)` — transforms form shape → API shape using `toId()`
4. Use `useResourceForm()` for form initialization + edit pre-filling
5. Use `useFormMutation()` for submit with automatic validation error mapping
6. Render with `Rhform` + `RhfTextField` / `RhfSelectField` / `RhfAsyncSelectField` etc.
7. Include error alert, submit button with loading/edit states

### Step 5: Create Page Component

Read the [Page Reference](./references/page.md) for the complete template.

Create `apps/dashboard/app/(authenticated)/<section>/<feature>/page.tsx`:

1. Add `"use client"` directive
2. Import `ResourcePage`, `ColumnHeader`, the form, client type, and routes
3. Configure: `pageTitle`, `title`, `routeKey`, `getClient`, `columns`, `renderForm`
4. Use `columns` callback to receive `actionsColumn` helper
5. Add sortable column headers with `<ColumnHeader>`
6. Include `actionsColumn()` as last column

### Step 6: Verify

- Ensure all imports resolve
- Check that route constants match OpenAPI paths
- Confirm the client is registered in both `clients/index.ts` and `api.ts`

## Key Conventions

### Naming

| Item | Pattern | Example |
|---|---|---|
| Client file | `packages/api/src/clients/<kebab-resource>.ts` | `job-cards.ts` |
| Client class | `<PascalResource>Client` | `JobCardsClient` |
| Routes const | `<UPPER_SNAKE>_ROUTES` | `JOB_CARD_ROUTES` |
| Schema file | `modules/<feature>/<feature>.schema.ts` | `job-card.schema.ts` |
| Form file | `modules/<feature>/<feature>-form.tsx` | `job-card-form.tsx` |
| Page file | `app/(authenticated)/<section>/<feature>/page.tsx` | `sales/job-cards/page.tsx` |
| Zod schema | `<camelFeature>FormSchema` | `jobCardFormSchema` |
| Form values type | `<PascalFeature>FormValues` | `JobCardFormValues` |
| Form component | `<PascalFeature>Form` | `JobCardForm` |
| Page component | `<PascalFeature>Page` (default export) | `JobCardsPage` |

### Relation Fields — Choosing the Right Component

**Two patterns exist. Pick the right one before building any relational field.**

#### Simple FK → `RhfAsyncSelectField`

Use for single-record foreign keys within the same domain or to a simple lookup/reference entity.

Examples: invoice → customer, bill → vendor, part → category, service → unit type, job card → vehicle, PO → department, any `*_type` or `*_terms` relation.

- Stored in form as `{ value: string, label: string } | null`
- Use `toRelation(id, name)` to convert API data → form value
- Use `toId(relation)` to convert form value → API payload
- Schema uses `relationFieldSchema = z.object({ value: z.string(), label: z.string() }).nullable()`

#### Cross-Domain Line Items → `RhfResourceField` (resource-selector skill)

Use when the relationship involves a **join table with extra fields** (quantity, rate, description) or the related items are from a **fully separate domain with its own CRUD page** and multiple records can be linked.

Examples: adding parts to a bill, linking services to an invoice, attaching expense items to a PO.

**→ Read the `resource-selector` SKILL before implementing these fields.**

Ready-to-use selector fields (import directly — do not re-implement):

| Component | Import path | For |
|---|---|---|
| `PartsSelectorField` | `@/modules/parts/parts-selector-field` | Parts line items |
| `ServicesSelectorField` | `@/modules/services/services-selector-field` | Service line items |
| `ExpenseItemsSelectorField` | `@/modules/expense-items/expense-items-selector-field` | Expense line items |

```tsx
// Schema: use an array sub-schema with part_id / service_id / expense_id
part_items: z.array(z.object({ part_id: z.number(), title: z.string(), quantity: z.number(), rate: z.number(), description: z.string().optional() })).optional()

// Form: render inside <FieldGroup>
<PartsSelectorField<MyFormValues, "part_items"> name="part_items" />
```

### Async Select Pattern

```tsx
const mapLookupOption = (item: any) => ({ value: String(item.id), label: item.name })
const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

<RhfAsyncSelectField
  name="field_name"
  label="Field Label"
  placeholder="Select..."
  queryKey={["query-key"]}
  listFn={() => api.resource.listSomething()}
  mapOption={mapLookupOption}
  {...STORE_OBJECT}
/>
```

### Available Form Field Components

| Component | Use For |
|---|---|
| `RhfTextField` | Text, email, phone, URL inputs |
| `RhfTextareaField` | Multi-line text |
| `RhfCheckboxField` | Boolean toggles |
| `RhfSelectField` | Static option dropdowns |
| `RhfAsyncSelectField` | Server-fetched single FK combobox (same-domain relation) |
| `RhfAsyncMultiSelectField` | Server-fetched multi-select combobox |
| `RhfResourceField` | Cross-domain multi-select with join table extra fields (parts, services, expenses) — see resource-selector skill |
| `RhfDateField` | Date picker — see date-time-pickers skill |
| `RhfTimeField` | Time picker — see date-time-pickers skill |

### Imports Cheat Sheet

```tsx
// Page
import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import type { <Resource>Client } from '@garage/api'
import { <RESOURCE>_ROUTES } from '@garage/api'

// Form
import { Rhform, RhfTextField, RhfSelectField, RhfAsyncSelectField } from "@/shared/components/form"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useAuthApi } from "@/shared/useApi"
import { toRelation, toId } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import { toast } from "sonner"

// Schema
import { z } from "zod"
```

## Extending the CRUD Codebase

If a feature requires functionality not covered by existing utilities (e.g. inline editing, tab-based forms, file uploads, nested resources), you are encouraged to extend the shared infrastructure:

- Add new form field components in `shared/components/form/controls/` and `shared/components/form/fields/`
- Add new hooks in `shared/hooks/`
- Extend `ResourcePage` props if needed
- Add new column helper factories in `shared/data-view/table-view/`
- Keep extensions generic and reusable — follow the same patterns as existing code
