# Invoices Feature — Design Spec

**Date:** 2026-06-09  
**Status:** Approved  

---

## Overview

Add a full invoice management UI to the ERP dashboard. Covers sales invoices (`/sales/invoices`) and purchase invoices (`/purchases/invoices`). Users can create, edit, post, and cancel invoices. The backend (NestJS service, controller, presenter, Prisma schema) is already complete — this spec covers the frontend-only work plus the API client layer.

---

## Routing

| URL | Page component |
|---|---|
| `/sales/invoices` | `<InvoicesPage direction="SALE" />` |
| `/purchases/invoices` | `<InvoicesPage direction="PURCHASE" />` |

Routes live under `app/[locale]/(authenticated)/sales/invoices/` and `.../purchases/invoices/`. The `sales/` and `purchases/` parent folders are created now so future index pages (`/sales`, `/purchases`) slot in without touching the invoices feature. `navGroups.tsx` hrefs update from `/invoices/sales` → `/sales/invoices` and `/invoices/purchases` → `/purchases/invoices`.

---

## Layer Inventory

### Already exists — no changes

| Layer | Path |
|---|---|
| Prisma schema | `packages/db-prisma/src/schema/invoice.prisma` |
| NestJS service | `apps/api/src/modules/invoicing/invoices/invoices.service.ts` |
| NestJS posting service | `apps/api/src/modules/invoicing/invoices/invoice-posting.service.ts` |
| NestJS controller | `apps/api/src/modules/invoicing/invoices/invoices.controller.ts` |
| NestJS presenter | `apps/api/src/modules/invoicing/invoices/presenters/invoice.presenter.ts` |
| DTOs | `apps/api/src/modules/invoicing/invoices/dto/invoice.dto.ts` |
| API contracts resource | `packages/api-contracts/src/resources/invoice.resource.ts` |

### Built by this feature

**Prerequisite clients** (needed by the form's `RhfResourceSelect` fields — built as part of this feature):

| Layer | File | Notes |
|---|---|---|
| API client | `packages/api-client/src/clients/invoice-types.client.ts` | Needs `list` method for invoice type selector |
| API client | `packages/api-client/src/clients/items.client.ts` | Needs `list` + `show` methods for item selector + price auto-fill |

**Invoice feature files:**

| Layer | File |
|---|---|
| API client | `packages/api-client/src/clients/invoices.client.ts` |
| API client registration | `packages/api-client/src/api.ts` |
| Dashboard config | `apps/dashboard/modules/invoices/invoices.config.ts` |
| Dashboard resource | `apps/dashboard/modules/invoices/invoices.resource.ts` |
| Dashboard columns | `apps/dashboard/modules/invoices/components/invoices-columns.tsx` |
| Dashboard page | `apps/dashboard/modules/invoices/components/invoices-page.tsx` |
| Invoice form modal | `apps/dashboard/modules/invoices/components/invoice-form-modal.tsx` |
| Status actions hook | `apps/dashboard/modules/invoices/hooks/use-invoice-actions.ts` |
| Resource hook | `apps/dashboard/modules/invoices/hooks/use-invoices-resource.ts` |
| Barrel | `apps/dashboard/modules/invoices/index.ts` |
| Route — sales | `apps/dashboard/app/[locale]/(authenticated)/sales/invoices/page.tsx` |
| Route — purchases | `apps/dashboard/app/[locale]/(authenticated)/purchases/invoices/page.tsx` |
| i18n | `messages/en.json`, `ar.json`, `tr.json` |

---

## API Client

`invoiceResource` uses `defineResource` (not `defineCrudResource`) because it has non-standard routes (`details` instead of `show`, plus `post` and `cancel`). The client is a **custom class**, not a `CrudClient` subclass.

### `InvoicesClient` methods

| Method | HTTP | Purpose |
|---|---|---|
| `list(query?)` | `GET /invoices` | Paginated list — accepts `{ direction, status, partyId, page, limit }` |
| `show(id)` | `GET /invoices/{id}` | Full detail with lines — used by form modal |
| `create(body)` | `POST /invoices` | Create new invoice (always starts as DRAFT) |
| `update(id, body)` | `PATCH /invoices/{id}` | Update header + lines (DRAFT only) |
| `post(id)` | `POST /invoices/{id}/post` | Transition DRAFT → POSTED |
| `cancel(id)` | `POST /invoices/{id}/cancel` | Transition POSTED → CANCELLED |
| `key` | `'invoices'` | React Query cache key prefix |

The client is registered in `createApi()` as `invoices: new InvoicesClient(client)`.

---

## List Page

### Resource

`generateResource<InvoicesClient>` with:
- `getClient: (api) => api.invoices`
- `paramKey: "invoices"`
- `list.defaultSort: { field: "createdAt", order: "desc" }`
- `list.searchIn: ["number", "partyName"]`
- `direction` injected as a fixed query param so each page variant pre-filters server-side

### `InvoicesPage` component

Accepts `direction: "SALE" | "PURCHASE"` prop. Renders `<InvoicesResource.Page>` with:
- `title`: `"Sales Invoices"` or `"Purchase Invoices"` based on direction
- `actions`: a **"New Invoice"** button that opens `InvoiceFormModal` in create mode
- `<InvoicesResource.Table columns={createInvoicesColumns} />`

### Columns

| Column | Notes |
|---|---|
| Number | Bold monospace (`INV-00001`) |
| Party | Party name |
| Date | Formatted date |
| Due Date | Formatted, muted when not set |
| Status | Colored badge — DRAFT (muted), POSTED (green), CANCELLED (destructive) |
| Total | Right-aligned with currency code |
| Lines | Line count chip (`3 lines`) |
| Actions | Custom status-aware menu (see below) |

### Row actions (status-aware)

| Status | Available actions |
|---|---|
| DRAFT | Edit · Post |
| POSTED | View (read-only) · Cancel |
| CANCELLED | View (read-only) |

Edit and View both open `InvoiceFormModal`. Post and Cancel trigger a confirmation `AlertDialog` before calling the API.

---

## Invoice Form Modal

### Layout

Full-screen modal (no backdrop scrolling). Three zones:

**Zone 1 — Sticky header bar**
- Left: invoice number (`"New Invoice"` on create, `"INV-00001"` on edit)
- Center: status badge + `postedAt` / `cancelledAt` timestamp when applicable
- Right: status-conditional action button (Post or Cancel) + close button

**Zone 2 — Scrollable body**

Two-column layout on desktop, single column on mobile.

*Left column — Header fields:*
- Invoice Type (`RhfResourceSelect` → `api.invoiceTypes`)
- Date (`RhfTextField` with `type="date"`)
- Due Date (`RhfTextField` with `type="date"`, optional)
- Party (`RhfResourceSelect` → `api.parties`)
- Warehouse (`RhfResourceSelect` → `api.warehouses`, optional)
- Fiscal Period (`RhfResourceSelect` → `api.fiscalPeriods`)
- Currency (`RhfResourceSelect` → `api.currencies`)
- Notes (`RhfTextareaField`, optional)

*Right column / full-width below — Line Items table:*

Inline editable table powered by `useFieldArray`. Each row:
- Item (`RhfResourceSelect` → `api.items`) — selecting auto-fills Unit from `item.baseUnitId` and Unit Price from `item.latestPurchasePrice` (purchase) or `item.defaultSellingPrice` (sale); direction is derived from the selected invoice type
- Unit (`RhfResourceSelect` → `api.units`)
- Qty (number input, min 0.0001)
- Unit Price (number input, min 0)
- Disc % (number input, default 0)
- Tax % (number input, default 0)
- Line Total (computed read-only, right-aligned)
- Delete row button

Below the table: **"+ Add line"** button appends a blank row.

**Zone 3 — Sticky footer**
- Left: Discard button (create mode only) — resets the form
- Right: live totals summary (Subtotal / Discount / Tax / **Total**) + Save button

Totals recompute client-side on every keystroke via `useWatch`-derived selector. No server round-trip for preview.

### Read-only mode

When `status` is `POSTED` or `CANCELLED`: all fields and inputs are disabled, footer shows totals only (no Save), header shows the appropriate action button (Cancel for POSTED, nothing for CANCELLED).

### State machine

| Status | Fields | Save | Post button | Cancel button |
|---|---|---|---|---|
| create (new) | editable | visible | visible | — |
| DRAFT (edit) | editable | visible | visible | — |
| POSTED | disabled | hidden | — | visible |
| CANCELLED | disabled | hidden | — | — |

### Internal hooks

| Hook | Responsibility |
|---|---|
| `useResourceForm` | Header field initial fetch + `mapInvoiceToFormValues` |
| `useFormMutation` | Submit with per-field error mapping from `ApiError.validationErrors` |
| `useFieldArray` | Line items array management (`append`, `remove`, `fields`) |
| `useWatch` | Live totals computation |
| `useInvoiceActions` | Post / Cancel — confirm dialog + mutation + toast + cache invalidation |

The modal uses `useResourceForm` and `useFormMutation` directly (the building blocks), not `useResourceFormController` — that wrapper is designed for the small dialog pattern and does not compose with a full-screen layout.

---

## Status Transitions — `useInvoiceActions`

Single hook exposing `postInvoice(id)` and `cancelInvoice(id)`.

**Flow for each action:**
1. Open `AlertDialog` with a clear consequence warning:
   - Post: *"This will lock the invoice and update stock. This cannot be undone."*
   - Cancel: *"This will reverse stock movements. The invoice will be marked as cancelled."*
2. On confirm: call `api.invoices.post(id)` or `api.invoices.cancel(id)`
3. On success: `toast.success(...)`, invalidate `invoices` React Query cache, close modal if open
4. On error: `toast.error(...)` with the server error message (e.g. *"Insufficient stock for item Laptop 15""*)

Used in both the modal header bar and the list row actions menu with identical behavior.

---

## Config — `invoices.config.ts`

Two Zod schemas (pure TS, no JSX):

**`invoiceHeaderSchema`** — validates the header fields (invoiceTypeId, date, partyId, etc.)

**`invoiceLineSchema`** — validates a single line (itemId, unitId, quantity, unitPrice, discountPercent, taxPercent)

**`invoiceFormSchema`** — top-level: `header: invoiceHeaderSchema` + `lines: z.array(invoiceLineSchema).min(1)`

Mappers: `mapInvoiceToFormValues(data)` — unwraps the API envelope and maps header + lines array.

Payload builders: `toCreateInvoiceDto(values)` and `toUpdateInvoiceDto(values)` — convert form values to the API DTOs.

---

## i18n Keys

All added to `en.json`, `ar.json`, and `tr.json` under `business.resources.invoices`:

```
entity, salesInvoices, purchaseInvoices, newInvoice,
number, party, date, dueDate, invoiceType, warehouse,
fiscalPeriod, currency, notes,
status.draft, status.posted, status.cancelled,
actions.post, actions.cancel, actions.postConfirm, actions.cancelConfirm,
lines.item, lines.unit, lines.quantity, lines.unitPrice,
lines.discountPercent, lines.taxPercent, lines.total, lines.addLine,
totals.subtotal, totals.discount, totals.tax, totals.total
```

---

## Constraints & Rules

- Only DRAFT invoices can be edited or posted
- Only POSTED invoices can be cancelled
- Invoice must have at least one line to be saved or posted
- Post and Cancel are irreversible — always require confirmation
- The form modal must never use `useResourceFormController` — it uses `useResourceForm` + `useFormMutation` directly
- Row actions column is custom — does not call `helpers.actionsColumn()`
- `invoices.config.ts` must not import React or contain JSX
- All user-facing strings go through `useTranslations` — no inline literals
