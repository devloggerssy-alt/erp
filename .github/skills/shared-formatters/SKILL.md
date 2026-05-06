---
name: shared-formatters
description: "Use the central shared/utils/formatters.ts file for all display formatting in the dashboard. Use when: formatting dates, times, numbers, currencies, or enum strings in table cells, detail pages, or any UI display. Avoid inline formatting logic like `toLocaleDateString()`, `.toLocaleString()`, or manual string splits. Import from @/shared/utils/formatters."
---

# Shared Formatters

Use this skill whenever work involves displaying dates, times, numbers, currencies, or enum strings in any UI component.

## Source of Truth

All shared display formatters live in:

```
apps/dashboard/shared/utils/formatters.ts
```

Import path: `@/shared/utils/formatters`

## Available Formatters

| Function | Input | Output example |
|---|---|---|
| `formatDate(value)` | string \| Date \| null | `"Jan 6, 2026"` |
| `formatDateTime(value)` | string \| Date \| null | `"Jan 6, 2026, 2:30 PM"` |
| `formatDateShort(value)` | string \| Date \| null | `"04/06/2026"` |
| `formatTime(value)` | string \| Date \| null | `"2:30 PM"` |
| `formatEnum(value)` | string \| null | `"In Progress"` |
| `formatNumber(value)` | number \| string \| null | `"150,000"` |
| `formatCurrency(value, currency?, locale?)` | number \| string \| null | `"$1,500.00"` |

All functions return `"—"` for null/undefined/invalid input — never return an empty string or throw.

## Rules

1. **Never inline formatting.** Do not use `new Date(x).toLocaleDateString()`, `Number(x).toLocaleString()`, or manual `split("_")` chains in components or pages. Use the shared formatters instead.

2. **Add before duplicating.** Check `formatters.ts` for an existing formatter before writing a new one. If a new formatter is needed, add it to `formatters.ts` — not inline.

3. **Keep all formatters in one file.** Do not create separate formatter files per module. All display formatting stays in `shared/utils/formatters.ts`.

4. **Consistent null handling.** Every formatter accepts `null | undefined` and returns `"—"`. Never require callers to guard against null before calling.

5. **Use `formatEnum` for status/type fields.** Any snake_case or underscore-separated enum value displayed as text must go through `formatEnum`.

## Workflow

1. Identify a display value needing formatting in a component.
2. Check `formatters.ts` for an existing matching formatter.
3. If found, import and use it.
4. If missing, add to `formatters.ts` following the null-safety pattern, then import.
5. Remove any inline formatting that the shared formatter now replaces.

## Examples

```tsx
import { formatDate, formatEnum, formatNumber, formatCurrency } from "@/shared/utils/formatters"

// Table cell — date
cell: ({ row }) => formatDate(row.original.created_at)

// Table cell — enum status
cell: ({ row }) => <Badge>{formatEnum(row.original.status)}</Badge>

// Table cell — number
cell: ({ row }) => formatNumber(row.original.km_in)

// Table cell — currency
cell: ({ row }) => formatCurrency(row.original.total_amount)

// Detail page field
<p>{formatDateTime(jobCard.updated_at)}</p>
```
