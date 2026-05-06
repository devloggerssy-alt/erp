---
name: resource-selector
description: "Use RhfResourceField and ResourceSelectorDialog for cross-domain relational line-item fields in forms. Use when: linking parts/services/expense-items to invoices, bills, purchase orders, or estimates; adding line-item tables with qty/rate/description; picking multiple records from a separate domain entity. Do NOT use for simple FK relations like 'customer type' or 'payment terms' — use RhfAsyncSelectField for those."
---

# Resource Selector (Cross-Domain Relations)

Use `RhfResourceField` + `ResourceSelectorDialog` when a form needs to pick **one or more records from a different domain** and store them as an **editable line-item array with extra data** (quantity, rate, description, etc.).

## Decision: RhfResourceField vs RhfAsyncSelectField

| Situation | Use |
|---|---|
| Linking parts / services / expense items to a bill, invoice, PO, or estimate | **`RhfResourceField`** |
| Picking multiple cross-domain items that need per-row extra fields (qty, rate) | **`RhfResourceField`** |
| Simple FK: invoice → customer, PO → vendor, job card → vehicle | **`RhfAsyncSelectField`** |
| Simple FK: insurance type, payment terms, category, department, unit type | **`RhfAsyncSelectField`** |
| Single-record lookup within the same domain | **`RhfAsyncSelectField`** |

**Rule:** If the relationship involves a **join table with extra fields** (quantity, rate, description, chart_of_account) or the related items are from a **fully separate domain with its own CRUD page**, use `RhfResourceField`. Otherwise use `RhfAsyncSelectField`.

### Domain Boundary Examples

```
Cross-domain (use RhfResourceField):       Simple FK (use RhfAsyncSelectField):
  Invoice ←→ Parts                           Invoice → Customer
  Invoice ←→ Services                        Invoice → Payment Terms
  Bill    ←→ Parts                           Bill → Vendor
  Bill    ←→ Services                        Bill → Department
  Bill    ←→ Expense Items                   Part → Category
  PO      ←→ Parts                           Service → Unit Type
  Estimate ←→ Services                       Job Card → Vehicle
```

## Architecture

| File | Purpose |
|---|---|
| `shared/components/resource-selector/resource-selector-dialog.tsx` | Generic dialog wrapping `CrudResource` with multi-row selection + Confirm/Cancel |
| `shared/components/resource-selector/rhf-resource-field.tsx` | RHF field: Card with trigger → opens dialog → renders items via `renderItems` callback |
| `modules/<domain>/<domain>-columns.tsx` | Shared column definitions reused by both the domain page and selector dialogs |
| `modules/<domain>/<domain>-selector-field.tsx` | Self-contained wrapper for a specific domain (e.g. `PartsSelectorField`) |

## Procedure

### Step 1: Create / Reuse Domain Columns File

If the domain already has a page, extract shared columns to `modules/<domain>/<domain>-columns.tsx`. This avoids duplication between the list page and the selector dialog.

```tsx
// modules/parts/parts-columns.tsx
import { ColumnHeader } from "@/shared/data-view/table-view"
import type { ColumnDef } from "@tanstack/react-table"

export const partColumns = {
    title: {
        accessorKey: "title",
        header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{(row.original as any).title || "—"}</span>,
    },
    purchasePrice: {
        accessorKey: "purchase_price",
        header: ({ column }) => <ColumnHeader column={column} title="Purchase Price" />,
        cell: ({ row }) => {
            const val = (row.original as any).purchase_price
            return val != null ? `$${Number(val).toFixed(2)}` : "—"
        },
    },
    // ... more columns
} satisfies Record<string, ColumnDef<any, any>>
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//    CRITICAL: use `satisfies Record<string, ColumnDef<any, any>>`
//    NOT `as ColumnDef<unknown>` — the latter causes type errors in ResourceSelectorDialog
```

### Step 2: Define the Item Shape in the Schema

Add a sub-schema for the line items inside the form schema:

```tsx
// In <resource>.schema.ts
const billPartItemSchema = z.object({
    part_id: z.number(),
    title: z.string(),          // display only, not sent to API
    quantity: z.number().min(1),
    rate: z.number().min(0),
    description: z.string().optional(),
})

const billFormSchema = z.object({
    // ... other fields
    part_items: z.array(billPartItemSchema).optional(),
    service_items: z.array(billServiceItemSchema).optional(),
})
```

### Step 3: Create the Selector Field Component

Create `modules/<domain>/<domain>-selector-field.tsx`:

```tsx
"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
    Table, TableHeader, TableBody,
    TableHead, TableRow, TableCell,
} from "@/shared/components/ui/table"
import { RhfResourceField } from "@/shared/components/resource-selector"
import { partColumns } from "./parts-columns"
import { PARTS_ROUTES } from "@garage/api"
import type { PartsClient } from "@garage/api"

type PartItem = {
    part_id: number
    title: string
    quantity: number
    rate: number
    description?: string
}

type Constraint = PartItem[] | undefined

export type PartsSelectorFieldProps<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
> = {
    name: TName & (TValues[TName] extends Constraint ? TName : never)
    label?: string
    triggerLabel?: string
}

export function PartsSelectorField<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
>({ name, label = "Parts", triggerLabel = "Add Parts" }: PartsSelectorFieldProps<TValues, TName>) {
    return (
        <RhfResourceField<TValues, TName, PartsClient>
            name={name}
            label={label}
            triggerLabel={triggerLabel}
            itemKey="part_id"          // deduplicate by this key when re-selecting
            dialogProps={{
                title: "Select Parts",
                crudProps: {
                    routeKey: PARTS_ROUTES.INDEX,
                    getClient: (api) => api.parts,
                    columns: [
                        partColumns.title,
                        partColumns.partNumber,
                        partColumns.purchasePrice,
                        partColumns.stock,
                    ],
                },
            }}
            mapSelected={(row) => {
                const r = row as any
                return {
                    part_id: r.id,
                    title: r.title || "",
                    quantity: 1,
                    rate: Number(r.purchase_price) || 0,
                    description: "",
                } as any
            }}
            renderItems={(items, { remove, update }) => (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Part</TableHead>
                            <TableHead className="w-24">Qty</TableHead>
                            <TableHead className="w-28">Rate</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {((items as PartItem[] | undefined) ?? []).map((item, index) => (
                            <TableRow key={item.part_id}>
                                <TableCell className="font-medium">{item.title}</TableCell>
                                <TableCell>
                                    <Input type="number" min={1} value={item.quantity}
                                        onChange={(e) => update(index, { ...item, quantity: Number(e.target.value) || 1 } as any)}
                                        className="h-8 w-20" />
                                </TableCell>
                                <TableCell>
                                    <Input type="number" min={0} step={0.01} value={item.rate}
                                        onChange={(e) => update(index, { ...item, rate: Number(e.target.value) || 0 } as any)}
                                        className="h-8 w-24" />
                                </TableCell>
                                <TableCell>
                                    <Input value={item.description ?? ""}
                                        onChange={(e) => update(index, { ...item, description: e.target.value } as any)}
                                        placeholder="Optional description" className="h-8" />
                                </TableCell>
                                <TableCell>
                                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        />
    )
}
```

### Step 4: Wire into the Form

```tsx
// In <resource>-form.tsx

// 1. Import
import { PartsSelectorField } from "@/modules/parts/parts-selector-field"
import { ServicesSelectorField } from "@/modules/services/services-selector-field"

// 2. Add to DEFAULT_VALUES
const DEFAULT_VALUES = {
    // ...
    part_items: [],
    service_items: [],
}

// 3. Map from API → form (in mapToFormValues)
part_items: (d.parts ?? []).map((p: any) => ({
    part_id: p.part_id ?? p.id,
    title: p.part?.title ?? p.title ?? "",
    quantity: Number(p.quantity) || 1,
    rate: Number(p.rate) || 0,
    description: p.description ?? "",
})),

// 4. Map from form → API payload (in mapFormToPayload)
part_items: (values.part_items ?? []).map((item) => ({
    part_id: item.part_id,
    quantity: item.quantity,
    rate: item.rate,
    description: item.description || undefined,
})),

// 5. Render inside <FieldGroup>
<PartsSelectorField<MyFormValues, "part_items"> name="part_items" />
<ServicesSelectorField<MyFormValues, "service_items"> name="service_items" />
```

## Existing Selector Fields (Ready to Use)

These are already built. Import and use directly — do NOT re-implement from scratch:

| Component | File | `itemKey` | Notes |
|---|---|---|---|
| `PartsSelectorField` | `modules/parts/parts-selector-field.tsx` | `part_id` | qty + rate + description editable |
| `ServicesSelectorField` | `modules/services/services-selector-field.tsx` | `service_id` | qty + rate + description editable |
| `ExpenseItemsSelectorField` | `modules/expense-items/expense-items-selector-field.tsx` | `expense_id` | qty + rate + description editable |

**Usage:**
```tsx
import { PartsSelectorField } from "@/modules/parts/parts-selector-field"
import { ServicesSelectorField } from "@/modules/services/services-selector-field"
import { ExpenseItemsSelectorField } from "@/modules/expense-items/expense-items-selector-field"

// Inside <FieldGroup>:
<PartsSelectorField<MyFormValues, "part_items"> name="part_items" />
<ServicesSelectorField<MyFormValues, "service_items"> name="service_items" />
<ExpenseItemsSelectorField<MyFormValues, "expense_items"> name="expense_items" />
```

## API Props Reference

### `RhfResourceField`

| Prop | Type | Required | Description |
|---|---|---|---|
| `name` | `FieldPath<TValues>` | ✅ | RHF field name; value is an array |
| `label` | `string` | ✅ | Card heading |
| `triggerLabel` | `string` | | Button label (defaults to `label`) |
| `mapSelected` | `(row) => ItemShape` | ✅ | Maps a selected table row to the form item shape |
| `renderItems` | `(items, helpers) => ReactNode` | ✅ | Renders the editable item table |
| `dialogProps` | object | ✅ | Config for the selector dialog (see below) |
| `itemKey` | `string` | | Field used for deduplication. Defaults to `"id"` |

### `dialogProps`

```ts
{
    title: string                  // Dialog heading
    crudProps: {
        routeKey: ApiPath          // e.g. PARTS_ROUTES.INDEX
        getClient: (api) => client // e.g. (api) => api.parts
        columns: ColumnDef[]       // Subset of domain columns to show
    }
    rowKey?: keyof Item            // Selection identity key (defaults to "id")
}
```

### `renderItems` helpers

| Helper | Signature | Description |
|---|---|---|
| `remove` | `(index: number) => void` | Remove item at index |
| `update` | `(index: number, item) => void` | Replace item at index |
| `replace` | `(items) => void` | Replace entire array |

## Common Pitfalls

- **Column type error**: Always use `satisfies Record<string, ColumnDef<any, any>>` on the columns object. Using `as ColumnDef<unknown>` per-entry causes type errors in the selector dialog.
- **itemKey mismatch**: The `itemKey` on `RhfResourceField` must match the field name in your item shape (e.g. `"part_id"`, not `"id"`).
- **Pre-fill in create mode**: `useResourceForm` uses a shallow spread for initial data. Pre-fill the field with already-shaped items (not raw API shape) to avoid empty arrays. See the `mapToFormValues` pattern above.
- **Selector field generic parameters**: Always pass both type params when using a selector field in a form: `<PartsSelectorField<MyFormValues, "part_items"> name="part_items" />`.
