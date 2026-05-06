---
name: date-time-pickers
description: "Use RhfDateField and RhfTimeField (shadcn Calendar/Popover-based) for all date and time inputs in forms. Use when: adding date fields, adding time fields, replacing `type=\"date\"` or `type=\"time\"` RhfTextField inputs, building any form that captures a date or time value."
---

# Date & Time Pickers

Always use the shadcn-based picker components for date and time fields. Never use `<RhfTextField type="date">` or `<RhfTextField type="time">`.

## Components

| Use For | Component | Import |
|---|---|---|
| Date fields (YYYY-MM-DD) | `RhfDateField` | `@/shared/components/form` |
| Time fields (HH:MM:SS) | `RhfTimeField` | `@/shared/components/form` |

## RhfDateField

Renders a shadcn Calendar inside a Popover. Value is a `string` in `"YYYY-MM-DD"` format.

```tsx
import { RhfDateField } from "@/shared/components/form"

<RhfDateField name="check_in_date" label="Check-in Date" />
```

**Schema type**: `z.string().optional()` (stores `"YYYY-MM-DD"`)

**Default value**: `""` for empty, or `new Date().toISOString().split("T")[0]` for today.

**`mapToFormValues`**: `d.check_in_date ? d.check_in_date.split("T")[0] : ""`

**`mapFormToPayload`**: `values.check_in_date || undefined`

## RhfTimeField

Renders an HH / MM / SS spinner inside a Popover. Value is a `string` in `"HH:MM:SS"` format.

```tsx
import { RhfTimeField } from "@/shared/components/form"

// With seconds (default)
<RhfTimeField name="check_in_time" label="Check-in Time" withSeconds />

// Without seconds
<RhfTimeField name="check_in_time" label="Check-in Time" />
```

**Props**:
- `withSeconds?: boolean` — show the SS spinner (default `true`)
- `placeholder?: string` — trigger button placeholder text

**Schema type**: `z.string().optional()` (stores `"HH:MM:SS"` or `"HH:MM"`)

**Default value for current time**:
```ts
(() => {
    const n = new Date()
    return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}:${String(n.getSeconds()).padStart(2,"0")}`
})()
```

**`mapToFormValues`** (API returns `"HH:MM"` or ISO datetime):
- If ISO: `d.check_in_time ? d.check_in_time.split("T")[1]?.slice(0, 8) ?? "" : ""`
- If plain time string: `d.check_in_time ?? ""`

**`mapFormToPayload`**: `values.check_in_time || undefined`

## Underlying Controls (non-RHF use)

If you need to use the pickers outside of RHF:

```tsx
import { DatePickerField, TimePickerField } from "@/shared/components/form"

<DatePickerField value={date} onChange={setDate} placeholder="Select date" />
<TimePickerField value={time} onChange={setTime} withSeconds />
```

## File Locations

- Control: `apps/dashboard/shared/components/form/controls/date-picker-field.tsx`
- Control: `apps/dashboard/shared/components/form/controls/time-picker-field.tsx`
- RHF wrapper: `apps/dashboard/shared/components/form/fields/rhf-date-field.tsx`
- RHF wrapper: `apps/dashboard/shared/components/form/fields/rhf-time-field.tsx`
- Exports: `apps/dashboard/shared/components/form/index.ts`
