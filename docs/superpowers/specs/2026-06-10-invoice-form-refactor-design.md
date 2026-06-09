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

```ts
// Replaces all `string` status usages
export type InvoiceStatus = "DRAFT" | "POSTED" | "CANCELLED"

// Typed shape for the _item virtual field
export interface InvoiceItemOption {
  id: string
  name?: string
  code?: string
  baseUnitId?: string
  latestPurchasePrice?: number | null
  defaultSellingPrice?: number | null
}
```

Update `invoiceLineSchema` to use `z.instanceof` — no change to runtime, just tighten the `_item` zod type to reference `InvoiceItemOption`-shaped keys.

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

### Key typing fix
Cache read typed via the api-contracts response shape:
```ts
type CachedInvoice = ApiResponse<"/invoices/{id}", "get">
const cached = queryClient.getQueryData<CachedInvoice>([api.invoices.key, "show", invoiceId])
const status = (cached?.data?.status ?? cached?.status) as InvoiceStatus | undefined
```

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

No `form` object passed wholesale. The `_item` auto-fill `useEffect` reads `useWatch({ control, name: \`lines.${index}._item\` })` typed as `InvoiceItemOption | null`.

**Typed item select:** `client` prop uses `(api: ReturnType<typeof useApi>) => api.items` — no `any` cast. `getValue` returns `InvoiceItemOption` (the full object), `getLabel`/`getId` are typed against `ResourceItem<ItemsClient>`.

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

| Before | After |
|---|---|
| `(api: any) => api.items` | `(api) => api.items` — `api` typed via `useApi()` return |
| `status: string \| undefined` | `InvoiceStatus \| undefined` |
| `t: (k: string) => string` | removed from all sub-component props |
| `cachedInvoice as any` | generic `getQueryData<CachedInvoice>` |
| `ReturnType<typeof useForm<InvoiceFormValues>>` as prop | `Control<…>`, `UseFormSetValue<…>`, `UseFormGetValues<…>` |
| `line: any` in mapper | `line: InvoiceLineApiShape` (local interface in config) |

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
