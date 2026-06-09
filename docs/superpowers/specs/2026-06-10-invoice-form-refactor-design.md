# Invoice Form Refactor — Design Spec

**Date:** 2026-06-10  
**Scope:** `apps/dashboard/modules/invoices/`  
**Goal:** Decompose `invoice-form-modal.tsx` into a SOLID, strongly-typed set of files. The form becomes standalone (embeddable outside a dialog). All `any` casts are eliminated.

---

## Problem Summary

`invoice-form-modal.tsx` (520 lines) violates SOLID and TypeScript best-practices:

| Problem | Detail |
|---|---|
| S — multiple responsibilities | Dialog chrome, form state, mutations, status actions, line-items table, totals, status badge, reset-on-close — all in one file |
| I — fat prop interface | `InvoiceLineRow` receives the entire `UseFormReturn<InvoiceFormValues>` when it needs only three methods |
| D — no abstraction | Modal directly instantiates mutations and reads the RQ cache instead of delegating to a hook |
| TypeScript | `(api: any) => api.items`, `cachedInvoice as any`, `status: string`, `t: (k: string) => string` |

---

## Target File Structure

```
modules/invoices/
├── invoices.config.ts              MODIFIED — add InvoiceStatus type + InvoiceItemOption interface
├── invoices.resource.ts            unchanged
├── hooks/
│   ├── use-invoice-form.ts         NEW — controller hook (all state + mutations)
│   ├── use-invoice-actions.ts      unchanged
│   ├── use-invoices-resource.ts    unchanged
│   └── index.ts                    MODIFIED — export new hook
└── components/
    ├── invoice-status-badge.tsx    NEW — atom: InvoiceStatus | undefined → Badge
    ├── invoice-line-row.tsx        NEW — single line row, typed Control props
    ├── invoice-form.tsx            NEW — standalone form (header fields + line table)
    ├── invoice-form-modal.tsx      REFACTORED — dialog chrome only (~70 lines)
    ├── invoices-columns.tsx        unchanged
    └── invoices-page.tsx           unchanged
```

`index.ts` gains `InvoiceForm` export.

---

## Layer 1 — Type additions in `invoices.config.ts`

**`InvoiceStatus` already exists** in `@devloggers/api-contracts` (`dto/invoice.dto.ts`). Import it from there — do NOT redefine it.

```ts
import type { InvoiceStatus } from "@devloggers/api-contracts"
```

Add these to `invoices.config.ts`:

```ts
// Virtual field shape — the full item object stored in _item before mapping to itemId
// Matches the fields we read off ResourceItem<ItemsClient> (all present in ItemResponseDto)
export interface InvoiceItemOption {
  id: string
  name: string
  code: string
  baseUnitId: string
  latestPurchasePrice: number | null
  defaultSellingPrice: number | null
}

// Move here from the inline type in invoice-form-modal.tsx
export type InvoiceDirection = "SALE" | "PURCHASE"

// Named return type for computeInvoiceTotals
export interface InvoiceTotals {
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
}

// Typed shape for the raw API line data in mapInvoiceToFormValues (replaces `line: any`)
interface InvoiceLineApiData {
  itemId?: string
  itemName?: string
  itemCode?: string
  unitId?: string
  quantity?: number | string
  unitPrice?: number | string
  discountPercent?: number | string
  taxPercent?: number | string
  notes?: string
  sortOrder?: number
}
```

Update `computeInvoiceTotals` return type annotation to `InvoiceTotals`.
Update `mapInvoiceToFormValues` to replace `line: any` with `line: InvoiceLineApiData`.
The zod schema itself does not change — runtime behaviour is identical.

---

## Layer 2 — `use-invoice-form.ts`

Central controller hook. Mirrors `useResourceFormController` but carries invoice-specific state.

### Input
```ts
type UseInvoiceFormOptions = {
  invoiceId: string | null
  direction: InvoiceDirection
  open: boolean         // drives reset-on-close
  onSuccess?: () => void
  onClose: () => void
}
```

### Output — `InvoiceFormController`
```ts
type InvoiceFormController = {
  // RHF
  form: UseFormReturn<InvoiceFormValues>
  fields: FieldArrayWithId<InvoiceFormValues, "lines">[]
  append: (line: InvoiceLineFormValues) => void
  remove: (index: number) => void
  // derived state
  isEditing: boolean
  isReadOnly: boolean           // status === POSTED | CANCELLED
  isBusy: boolean               // isInitializing || isPending
  isPending: boolean
  status: InvoiceStatus | undefined
  invoiceNumber: string | undefined
  totals: InvoiceTotals         // computed from useWatch
  // submit
  onSubmit: () => void          // calls form.handleSubmit(mutate)()
  // status transitions
  postInvoice: () => void       // only safe when status === DRAFT
  cancelInvoice: () => void     // only safe when status === POSTED
}
```

### Internal composition
- `useResourceForm` — form init + edit population
- `useFieldArray` — lines array
- `useWatch` — live totals
- `useFormMutation` — create/update mutation + toast
- `useQueryClient.getQueryData` — typed cache read for `status` + `invoiceNumber`
- `useInvoiceActions` — post/cancel (delegates `onClose` to the callback)
- `useEffect([open])` — reset-on-close

### Key typing decisions

**Cache read** — `InvoicesClient.show` returns `any` (the client itself uses `as any` internally). Define a local interface so at least our consumer is typed:

```ts
// Local to use-invoice-form.ts — documents what we expect from the cache
interface CachedInvoiceEntry {
  data?: { status?: InvoiceStatus; number?: string }
  // flat shape (some API wrappers hoist data fields)
  status?: InvoiceStatus
  number?: string
}

const cached = queryClient.getQueryData<CachedInvoiceEntry>(
  [api.invoices.key, "show", invoiceId]
)
const status: InvoiceStatus | undefined = cached?.data?.status ?? cached?.status
const invoiceNumber: string | undefined = cached?.data?.number ?? cached?.number
```

No `as any` cast. The `status` and `number` variables are inferred as the correct types from the interface.

**`useInvoiceActions` callback** — `useInvoiceActions` already accepts `onSuccess?: () => void`. Pass `() => { onSuccess?.(); onClose() }` as the callback instead of duplicating those calls in two places.

**`api.invoices.key` query key** — use `api.invoices.key` (string literal `"invoices"`) directly — already typed via `InvoicesClient.key`.

---

## Layer 3 — `invoice-status-badge.tsx`

Single-responsibility atom.

```ts
type InvoiceStatusBadgeProps = { status: InvoiceStatus | undefined }
```

Receives `InvoiceStatus`, not `string`. No translation prop — calls `useTranslations` itself.

---

## Layer 4 — `invoice-line-row.tsx`

Replaces the inline `InvoiceLineRow` function. Receives the minimum RHF surface it needs:

```ts
type InvoiceLineRowProps = {
  index: number
  control: Control<InvoiceFormValues>
  setValue: UseFormSetValue<InvoiceFormValues>
  getValues: UseFormGetValues<InvoiceFormValues>
  direction: InvoiceDirection
  onRemove: () => void
  disabled: boolean
}
```

No `form` object passed wholesale. The `_item` auto-fill `useEffect` reads:
```ts
const itemOption = useWatch({ control, name: `lines.${index}._item` }) as InvoiceItemOption | null
```

**Typed item select** — `ResourceItem<ItemsClient>` is fully typed from the OpenAPI schema. `ItemResponseDto` contains `id`, `code`, `name`, `baseUnitId`, `defaultSellingPrice`, `latestPurchasePrice` — all present in the generated types. So `getLabel`, `getValue`, `getId` receive typed items with zero `any`:

```tsx
<RhfResourceSelect<
  InvoiceFormValues,
  `lines.${number}._item`,
  ItemsClient,
  InvoiceItemOption
>
  name={`lines.${index}._item` as `lines.${number}._item`}
  client={(api) => api.items}
  getLabel={(it) => `${it.code} ${it.name}`.trim()}
  getValue={(it) => ({
    id: it.id,
    name: it.name,
    code: it.code,
    baseUnitId: it.baseUnitId,
    latestPurchasePrice: it.latestPurchasePrice,
    defaultSellingPrice: it.defaultSellingPrice,
  })}
  getId={(it) => it.id}
/>
```

The `name` cast `as \`lines.${number}._item\`` is a narrow template-literal cast (not `as any`) asserting that this dynamic string is a valid field path shape.

No translation prop — calls `useTranslations` itself.

---

## Layer 5 — `invoice-form.tsx` (standalone)

```ts
type InvoiceFormProps = { ctrl: InvoiceFormController }
```

Renders `<Rhform form={ctrl.form} onSubmit={ctrl.onSubmit}>` with a two-column grid:

- **Left — header fields** (invoiceType, date/dueDate, party, warehouse, fiscalPeriod, currency, notes). These fields use `useFormContext` internally (via `RhfTextField`/`RhfResourceSelect`) — no extra prop drilling needed.
- **Right — line items** (table + `InvoiceLineRow` per field + Add Line button when not read-only).

`InvoiceLineItems` inner component receives only what it needs from `ctrl`: `fields`, `append`, `remove`, `control`, `setValue`, `getValues`, `direction`, `isReadOnly`, `isBusy`, `isPending`.

No dialog chrome. No totals. No submit button. Embeddable in any container.

---

## Layer 6 — `invoice-form-modal.tsx` (refactored)

Thin wrapper — ~70 lines. Instantiates the controller, renders three dialog zones.

```ts
// Props unchanged (public API preserved)
type InvoiceFormModalProps = {
  open: boolean
  onClose: () => void
  invoiceId: string | null
  direction: InvoiceDirection
  onSuccess?: () => void
}
```

**Zone 1 — sticky header**
```
[invoice number | InvoiceStatusBadge]   [Post] [Cancel] [X]
```
Post/Cancel buttons conditionally rendered from `ctrl.status`.

**Zone 2 — scrollable body**
```
<InvoiceForm ctrl={ctrl} />
```

**Zone 3 — sticky footer**
```
[Discard]          [subtotal | discount | tax | total]   [Save/Update button]
```
Submit button calls `ctrl.onSubmit()` (type="button"), stays outside `<Rhform>` but wired via `handleSubmit`.

---

## TypeScript Invariants

| Location | Before | After |
|---|---|---|
| `InvoiceLineRow` props | `form: ReturnType<typeof useForm<InvoiceFormValues>>` | `control`, `setValue`, `getValues` — minimum surface only |
| `RhfResourceSelect` client | `(api: any) => api.items` | `(api) => api.items` — `api` inferred as `Api` from `useApi()` |
| `RhfResourceSelect` for `invoice-types`, `fiscal-periods` | `(api as any)["invoice-types"]` | `(api) => api["invoice-types"]` — key is a typed literal on `Api` |
| Status variable | `status: string \| undefined` | `InvoiceStatus \| undefined` — imported from `@devloggers/api-contracts` |
| Cache read | `cachedInvoice as any` | `getQueryData<CachedInvoiceEntry>` — local typed interface |
| `t` prop on sub-components | `t: (k: string) => string` | removed — each component calls `useTranslations()` itself |
| Mapper line | `line: any` | `line: InvoiceLineApiData` — local interface in config |
| `name` on dynamic fields | `\`lines.\${index}._item\` as any` | `as \`lines.\${number}._item\`` — narrow template-literal cast |
| `InvoiceDirection` | defined inline in modal | moved to `invoices.config.ts`, re-exported from `index.ts` |
| Totals return type | inferred `{}` | named `InvoiceTotals` interface |

**One remaining internal `as any` that is acceptable:** `RhfResourceSelect` itself spreads `{...controlProps as any}` inside its implementation — this is inside the shared library, not in our module code. Our call sites are fully typed.

---

## What Does NOT Change

- `invoices.config.ts` schemas, defaults, mappers, payload builders, totals functions — logic unchanged, types tightened only
- `invoices-page.tsx` — no change (still uses `InvoiceFormModal` with same props)
- `invoices-columns.tsx` — no change
- `use-invoice-actions.ts` — no change
- Public API: `InvoiceFormModal` props signature is preserved

---

## File Sizes (estimated)

| File | Lines |
|---|---|
| `use-invoice-form.ts` | ~90 |
| `invoice-status-badge.tsx` | ~25 |
| `invoice-line-row.tsx` | ~90 |
| `invoice-form.tsx` | ~100 |
| `invoice-form-modal.tsx` | ~75 |
| **Total** | **~380 vs 520** |
