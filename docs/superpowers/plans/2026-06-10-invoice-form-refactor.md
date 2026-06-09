# Invoice Form Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose `invoice-form-modal.tsx` into SOLID, strongly-typed files — a controller hook, an atom badge, a typed line-row, a standalone form, and a thin modal wrapper — eliminating all `any` casts in module code.

**Architecture:** Extract all state/mutation logic into `use-invoice-form.ts` (mirrors `useResourceFormController`). Separate JSX into `invoice-status-badge.tsx`, `invoice-line-row.tsx`, and `invoice-form.tsx` (standalone, embeddable anywhere). `invoice-form-modal.tsx` becomes a ~70-line dialog shell that composes these pieces. TypeScript types tightened throughout `invoices.config.ts` without changing runtime behaviour.

**Tech Stack:** React 18, React Hook Form (`useForm`, `useFieldArray`, `useWatch`, `Control`, `UseFormSetValue`, `UseFormGetValues`), TanStack Query (`useQueryClient`), next-intl (`useTranslations`), Zod, `@devloggers/api-client` (`ItemsClient`, `Api`, `InvoicesClient`), `@devloggers/api-contracts` (`InvoiceStatus`)

---

## File Map

| Action | Path |
|---|---|
| **Modify** | `apps/dashboard/modules/invoices/invoices.config.ts` |
| **Create** | `apps/dashboard/modules/invoices/hooks/use-invoice-form.ts` |
| **Modify** | `apps/dashboard/modules/invoices/hooks/index.ts` |
| **Create** | `apps/dashboard/modules/invoices/components/invoice-status-badge.tsx` |
| **Create** | `apps/dashboard/modules/invoices/components/invoice-line-row.tsx` |
| **Create** | `apps/dashboard/modules/invoices/components/invoice-form.tsx` |
| **Replace** | `apps/dashboard/modules/invoices/components/invoice-form-modal.tsx` |
| **Modify** | `apps/dashboard/modules/invoices/index.ts` |

---

## Task 1: Tighten `invoices.config.ts`

Add named types, move `InvoiceDirection`, fix `line: any` in the mapper, add `InvoiceTotals` return annotation. Zero runtime changes.

**Files:**
- Modify: `apps/dashboard/modules/invoices/invoices.config.ts`

- [ ] **Step 1: Replace the config file with the typed version**

Open `apps/dashboard/modules/invoices/invoices.config.ts` and replace its entire contents with:

```ts
import { z } from "zod"
import type { InvoiceStatus } from "@devloggers/api-contracts"
import type { CreateInvoiceDto, UpdateInvoiceDto } from "@devloggers/api-contracts"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

// Re-export InvoiceStatus from contracts so module consumers have one import point
export type { InvoiceStatus }

// ── New shared types ───────────────────────────────────────────────────────────

export type InvoiceDirection = "SALE" | "PURCHASE"

/** Full item object stored in the virtual _item field before mapping to itemId.
 *  Fields match ItemResponseDto from the OpenAPI schema. */
export interface InvoiceItemOption {
    id: string
    name: string
    code: string
    baseUnitId: string
    latestPurchasePrice: number | null
    defaultSellingPrice: number | null
}

/** Named return type for computeInvoiceTotals */
export interface InvoiceTotals {
    subtotal: number
    discountAmount: number
    taxAmount: number
    total: number
}

/** Typed shape for raw API line data coming back from the server */
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

// ── Line item schema ───────────────────────────────────────────────────────────

export const invoiceLineSchema = z.object({
    _item: z.object({
        id: z.string(),
        name: z.string().optional(),
        code: z.string().optional(),
        baseUnitId: z.string().optional(),
        latestPurchasePrice: z.number().nullable().optional(),
        defaultSellingPrice: z.number().nullable().optional(),
    }).nullable().optional(),
    itemId: z.string().min(1, "Item is required"),
    unitId: z.string().min(1, "Unit is required"),
    quantity: z.coerce.number().min(0.0001, "Must be > 0"),
    unitPrice: z.coerce.number().min(0, "Must be ≥ 0"),
    discountPercent: z.coerce.number().min(0).max(100).default(0),
    taxPercent: z.coerce.number().min(0).max(100).default(0),
    notes: z.string().optional(),
    sortOrder: z.number().optional(),
})

export type InvoiceLineFormValues = z.infer<typeof invoiceLineSchema>

// ── Invoice form schema ────────────────────────────────────────────────────────

export const invoiceFormSchema = z.object({
    invoiceTypeId: z.string().min(1, "Invoice type is required"),
    date: z.string().min(1, "Date is required"),
    dueDate: z.string().optional(),
    partyId: z.string().min(1, "Party is required"),
    warehouseId: z.string().optional(),
    fiscalPeriodId: z.string().min(1, "Fiscal period is required"),
    currencyId: z.string().min(1, "Currency is required"),
    notes: z.string().optional(),
    lines: z.array(invoiceLineSchema).min(1, "At least one line is required"),
})

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

// ── Defaults ───────────────────────────────────────────────────────────────────

export const DEFAULT_INVOICE_LINE: InvoiceLineFormValues = {
    _item: null,
    itemId: "",
    unitId: "",
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    taxPercent: 0,
    notes: "",
}

export const DEFAULT_INVOICE_FORM_VALUES: InvoiceFormValues = {
    invoiceTypeId: "",
    date: new Date().toISOString().split("T")[0]!,
    dueDate: "",
    partyId: "",
    warehouseId: "",
    fiscalPeriodId: "",
    currencyId: "",
    notes: "",
    lines: [{ ...DEFAULT_INVOICE_LINE }],
}

// ── Mapper ─────────────────────────────────────────────────────────────────────

export function mapInvoiceToFormValues(data: unknown): InvoiceFormValues {
    const resolved = unwrapApiData<{ [key: string]: unknown; lines?: InvoiceLineApiData[] }>(data)
    return {
        invoiceTypeId: (resolved?.invoiceTypeId as string) ?? "",
        date: resolved?.date ? new Date(resolved.date as string).toISOString().split("T")[0]! : "",
        dueDate: resolved?.dueDate ? new Date(resolved.dueDate as string).toISOString().split("T")[0]! : "",
        partyId: (resolved?.partyId as string) ?? "",
        warehouseId: (resolved?.warehouseId as string) ?? "",
        fiscalPeriodId: (resolved?.fiscalPeriodId as string) ?? "",
        currencyId: (resolved?.currencyId as string) ?? "",
        notes: (resolved?.notes as string) ?? "",
        lines: (resolved?.lines ?? [{ ...DEFAULT_INVOICE_LINE }]).map((line) => ({
            _item: line.itemId ? {
                id: line.itemId,
                name: line.itemName,
                code: line.itemCode,
                baseUnitId: line.unitId,
            } : null,
            itemId: line.itemId ?? "",
            unitId: line.unitId ?? "",
            quantity: Number(line.quantity) || 1,
            unitPrice: Number(line.unitPrice) || 0,
            discountPercent: Number(line.discountPercent) || 0,
            taxPercent: Number(line.taxPercent) || 0,
            notes: line.notes ?? "",
            sortOrder: line.sortOrder,
        })),
    }
}

// ── Payload builders ───────────────────────────────────────────────────────────

export function toCreateInvoiceDto(values: InvoiceFormValues): CreateInvoiceDto {
    return {
        invoiceTypeId: values.invoiceTypeId,
        date: values.date,
        dueDate: values.dueDate || undefined,
        partyId: values.partyId,
        warehouseId: values.warehouseId || undefined,
        fiscalPeriodId: values.fiscalPeriodId,
        currencyId: values.currencyId,
        notes: values.notes || undefined,
        lines: values.lines.map((line, index) => ({
            itemId: line.itemId,
            unitId: line.unitId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            taxPercent: line.taxPercent,
            notes: line.notes || undefined,
            sortOrder: line.sortOrder ?? index,
        })),
    }
}

export function toUpdateInvoiceDto(values: InvoiceFormValues): UpdateInvoiceDto {
    return {
        date: values.date,
        dueDate: values.dueDate || undefined,
        partyId: values.partyId,
        warehouseId: values.warehouseId || undefined,
        currencyId: values.currencyId,
        notes: values.notes || undefined,
        lines: values.lines.map((line, index) => ({
            itemId: line.itemId,
            unitId: line.unitId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            taxPercent: line.taxPercent,
            notes: line.notes || undefined,
            sortOrder: line.sortOrder ?? index,
        })),
    }
}

// ── Totals computation (pure, no side effects) ─────────────────────────────────

export function computeLineTotals(line: Pick<InvoiceLineFormValues, "quantity" | "unitPrice" | "discountPercent" | "taxPercent">) {
    const lineSubtotal = (line.quantity || 0) * (line.unitPrice || 0)
    const discountAmount = lineSubtotal * ((line.discountPercent || 0) / 100)
    const afterDiscount = lineSubtotal - discountAmount
    const taxAmount = afterDiscount * ((line.taxPercent || 0) / 100)
    return {
        lineTotal: afterDiscount + taxAmount,
        discountAmount,
        taxAmount,
    }
}

export function computeInvoiceTotals(lines: InvoiceLineFormValues[]): InvoiceTotals {
    let subtotal = 0
    let discountAmount = 0
    let taxAmount = 0

    for (const line of lines) {
        const ls = (line.quantity || 0) * (line.unitPrice || 0)
        const ld = ls * ((line.discountPercent || 0) / 100)
        const la = (ls - ld) * ((line.taxPercent || 0) / 100)
        subtotal += ls
        discountAmount += ld
        taxAmount += la
    }

    return { subtotal, discountAmount, taxAmount, total: subtotal - discountAmount + taxAmount }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/dashboard && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors from `invoices.config.ts`. Fix any errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/invoices/invoices.config.ts
git commit -m "refactor(invoices): add InvoiceDirection, InvoiceItemOption, InvoiceTotals types; fix line:any in mapper"
```

---

## Task 2: Create `invoice-status-badge.tsx`

Atomic component: status union type → coloured badge. No translation prop.

**Files:**
- Create: `apps/dashboard/modules/invoices/components/invoice-status-badge.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import type { InvoiceStatus } from "../invoices.config"

type InvoiceStatusBadgeProps = {
    status: InvoiceStatus | undefined
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
    const t = useTranslations("business.resources.invoices")

    if (!status) return null

    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs font-medium",
                status === "POSTED" && "border-green-500 text-green-700 dark:text-green-400",
                status === "CANCELLED" && "border-destructive text-destructive",
                status === "DRAFT" && "border-muted-foreground text-muted-foreground",
            )}
        >
            {status === "POSTED"
                ? t("status.posted")
                : status === "CANCELLED"
                    ? t("status.cancelled")
                    : t("status.draft")}
        </Badge>
    )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/dashboard && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/invoices/components/invoice-status-badge.tsx
git commit -m "feat(invoices): add InvoiceStatusBadge atom with typed InvoiceStatus prop"
```

---

## Task 3: Create `use-invoice-form.ts`

Controller hook: all form state, mutations, cache read, and status actions in one place. Zero `any` in hook code.

**Files:**
- Create: `apps/dashboard/modules/invoices/hooks/use-invoice-form.ts`

- [ ] **Step 1: Create the file**

```ts
"use client"

import { useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form"
import type { FieldArrayWithId } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import type { InvoiceStatus } from "@devloggers/api-contracts"
import {
    DEFAULT_INVOICE_FORM_VALUES,
    DEFAULT_INVOICE_LINE,
    mapInvoiceToFormValues,
    invoiceFormSchema,
    toCreateInvoiceDto,
    toUpdateInvoiceDto,
    computeInvoiceTotals,
    type InvoiceDirection,
    type InvoiceFormValues,
    type InvoiceLineFormValues,
    type InvoiceTotals,
} from "../invoices.config"
import { useInvoiceActions } from "./use-invoice-actions"

// ── Types ──────────────────────────────────────────────────────────────────────

export type UseInvoiceFormOptions = {
    invoiceId: string | null
    direction: InvoiceDirection
    open: boolean
    onSuccess?: () => void
    onClose: () => void
}

export type InvoiceFormController = {
    form: UseFormReturn<InvoiceFormValues>
    fields: FieldArrayWithId<InvoiceFormValues, "lines">[]
    append: (line: InvoiceLineFormValues) => void
    remove: (index: number) => void
    isEditing: boolean
    isReadOnly: boolean
    isBusy: boolean
    isPending: boolean
    status: InvoiceStatus | undefined
    invoiceNumber: string | undefined
    totals: InvoiceTotals
    onSubmit: () => void
    postInvoice: () => void
    cancelInvoice: () => void
    direction: InvoiceDirection
}

// Cache entry shape — InvoicesClient.show() returns any internally, so we
// define what we expect to find and pass it as a type parameter to getQueryData.
interface CachedInvoiceEntry {
    data?: { status?: InvoiceStatus; number?: string }
    status?: InvoiceStatus
    number?: string
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useInvoiceForm({
    invoiceId,
    direction,
    open,
    onSuccess,
    onClose,
}: UseInvoiceFormOptions): InvoiceFormController {
    const api = useApi()
    const tf = useTranslations("system.resourceForm")
    const t = useTranslations("business.resources.invoices")
    const queryClient = useQueryClient()
    const isEditing = !!invoiceId

    // ── Form init ──────────────────────────────────────────────────────────────

    const { form, isInitializing } = useResourceForm<InvoiceFormValues, unknown>({
        schema: invoiceFormSchema,
        defaultValues: DEFAULT_INVOICE_FORM_VALUES,
        resourceId: invoiceId,
        initialize: (id) => api.invoices.show(id),
        mapToFormValues: mapInvoiceToFormValues,
        queryKey: [api.invoices.key, "show", invoiceId],
    })

    // ── Field array ────────────────────────────────────────────────────────────

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    })

    // ── Status from cache ──────────────────────────────────────────────────────

    const cached = isEditing
        ? queryClient.getQueryData<CachedInvoiceEntry>([api.invoices.key, "show", invoiceId])
        : undefined

    const status: InvoiceStatus | undefined = cached?.data?.status ?? cached?.status
    const invoiceNumber: string | undefined = cached?.data?.number ?? cached?.number
    const isReadOnly = status === "POSTED" || status === "CANCELLED"

    // ── Live totals ────────────────────────────────────────────────────────────

    const watchedLines = useWatch({
        control: form.control,
        name: "lines",
    }) as InvoiceLineFormValues[]

    const totals = useMemo(
        () => computeInvoiceTotals(watchedLines ?? []),
        [watchedLines],
    )

    // ── Submit mutation ────────────────────────────────────────────────────────

    const { mutate, isPending } = useFormMutation(form, {
        mutationFn: (values: InvoiceFormValues) => {
            const promise = isEditing
                ? api.invoices.update(invoiceId!, toUpdateInvoiceDto(values))
                : api.invoices.create(toCreateInvoiceDto(values))

            toast.promise(promise, {
                loading: isEditing ? tf("updating") : tf("creating"),
                success: isEditing
                    ? tf("updated", { entity: t("entity") })
                    : tf("created", { entity: t("entity") }),
                error: isEditing
                    ? tf("updateFailed", { entity: t("entity") })
                    : tf("createFailed", { entity: t("entity") }),
            })

            return promise
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.invoices.key] })
            form.reset(DEFAULT_INVOICE_FORM_VALUES)
            onSuccess?.()
            onClose()
        },
    })

    // ── Status actions ─────────────────────────────────────────────────────────

    const { postInvoice: postById, cancelInvoice: cancelById } = useInvoiceActions(() => {
        queryClient.invalidateQueries({ queryKey: [api.invoices.key, "show", invoiceId] })
        onSuccess?.()
        onClose()
    })

    // ── Reset on close ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (!open) {
            form.reset(DEFAULT_INVOICE_FORM_VALUES)
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Return controller ──────────────────────────────────────────────────────

    return {
        form,
        fields,
        append: (line) => append({ ...DEFAULT_INVOICE_LINE, ...line }),
        remove,
        isEditing,
        isReadOnly,
        isBusy: isInitializing || isPending,
        isPending,
        status,
        invoiceNumber,
        totals,
        onSubmit: () => form.handleSubmit((values) => mutate(values))(),
        postInvoice: () => invoiceId && postById(invoiceId),
        cancelInvoice: () => invoiceId && cancelById(invoiceId),
        direction,
    }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/dashboard && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors. If `postById`/`cancelById` return type causes a void mismatch, wrap in an arrow: `() => { if (invoiceId) postById(invoiceId) }`.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/invoices/hooks/use-invoice-form.ts
git commit -m "feat(invoices): add useInvoiceForm controller hook with typed cache read and zero any"
```

---

## Task 4: Create `invoice-line-row.tsx`

Typed line-row component. Receives minimum RHF surface (`Control`, `setValue`, `getValues`). Item select is fully typed via `ResourceItem<ItemsClient>` → `InvoiceItemOption`.

**Files:**
- Create: `apps/dashboard/modules/invoices/components/invoice-line-row.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { useWatch } from "react-hook-form"
import type { Control, UseFormSetValue, UseFormGetValues } from "react-hook-form"
import { Trash2Icon } from "lucide-react"
import type { ItemsClient, UnitsClient } from "@devloggers/api-client"
import { Button } from "@/shared/components/ui/button"
import { RhfTextField } from "@/shared/components/form"
import { RhfResourceSelect } from "@/shared/components/form"
import { computeLineTotals } from "../invoices.config"
import type {
    InvoiceFormValues,
    InvoiceLineFormValues,
    InvoiceItemOption,
    InvoiceDirection,
} from "../invoices.config"

// ── Types ──────────────────────────────────────────────────────────────────────

export type InvoiceLineRowProps = {
    index: number
    control: Control<InvoiceFormValues>
    setValue: UseFormSetValue<InvoiceFormValues>
    getValues: UseFormGetValues<InvoiceFormValues>
    direction: InvoiceDirection
    onRemove: () => void
    disabled: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────

export function InvoiceLineRow({
    index,
    control,
    setValue,
    getValues,
    direction,
    onRemove,
    disabled,
}: InvoiceLineRowProps) {
    const t = useTranslations("business.resources.invoices")

    // Watch the full item object to auto-fill unit + price on selection
    const itemOption = useWatch({
        control,
        name: `lines.${index}._item` as `lines.${number}._item`,
    }) as InvoiceItemOption | null

    useEffect(() => {
        if (!itemOption?.id) return

        setValue(`lines.${index}.itemId` as `lines.${number}.itemId`, itemOption.id)

        const currentUnit = getValues(`lines.${index}.unitId` as `lines.${number}.unitId`)
        if (!currentUnit && itemOption.baseUnitId) {
            setValue(`lines.${index}.unitId` as `lines.${number}.unitId`, itemOption.baseUnitId)
        }

        const currentPrice = getValues(`lines.${index}.unitPrice` as `lines.${number}.unitPrice`)
        if (!currentPrice || currentPrice === 0) {
            const price = direction === "PURCHASE"
                ? (itemOption.latestPurchasePrice ?? 0)
                : (itemOption.defaultSellingPrice ?? 0)
            setValue(`lines.${index}.unitPrice` as `lines.${number}.unitPrice`, Number(price))
        }
    }, [itemOption?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Watch the full line for live total display
    const watchedLine = useWatch({
        control,
        name: `lines.${index}` as `lines.${number}`,
    }) as InvoiceLineFormValues

    const { lineTotal } = computeLineTotals(watchedLine)

    return (
        <tr className="border-b last:border-0 group">
            <td className="p-1 min-w-[180px]">
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
                    placeholder={t("lines.item")}
                    disabled={disabled}
                    pageSize={30}
                />
            </td>
            <td className="p-1 min-w-[120px]">
                <RhfResourceSelect<InvoiceFormValues, `lines.${number}.unitId`, UnitsClient, string>
                    name={`lines.${index}.unitId` as `lines.${number}.unitId`}
                    client={(api) => api.units}
                    getLabel={(it) => it.name as string}
                    getValue={(it) => it.id as string}
                    placeholder={t("lines.unit")}
                    disabled={disabled}
                    pageSize={30}
                />
            </td>
            <td className="p-1 w-20">
                <RhfTextField
                    name={`lines.${index}.quantity` as `lines.${number}.quantity`}
                    type="number"
                    placeholder="1"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-28">
                <RhfTextField
                    name={`lines.${index}.unitPrice` as `lines.${number}.unitPrice`}
                    type="number"
                    placeholder="0"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-16">
                <RhfTextField
                    name={`lines.${index}.discountPercent` as `lines.${number}.discountPercent`}
                    type="number"
                    placeholder="0"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-16">
                <RhfTextField
                    name={`lines.${index}.taxPercent` as `lines.${number}.taxPercent`}
                    type="number"
                    placeholder="0"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-28 text-end tabular-nums text-sm font-medium">
                {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="p-1 w-8">
                {!disabled && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={onRemove}
                    >
                        <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                )}
            </td>
        </tr>
    )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/dashboard && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors. The `it.name`, `it.code`, `it.baseUnitId` etc. are typed via `ResourceItem<ItemsClient>` → `ItemResponseDto` from the generated OpenAPI schema.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/invoices/components/invoice-line-row.tsx
git commit -m "feat(invoices): add InvoiceLineRow with typed Control props and zero any"
```

---

## Task 5: Create `invoice-form.tsx` (standalone)

The form itself — header fields + line items table. No dialog chrome. No totals. No submit button. Embeddable anywhere.

**Files:**
- Create: `apps/dashboard/modules/invoices/components/invoice-form.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"
import type { InvoiceTypesClient, PartiesClient, WarehousesClient, FiscalPeriodsClient, CurrenciesClient } from "@devloggers/api-client"
import { Button } from "@/shared/components/ui/button"
import { Rhform } from "@/shared/components/form"
import { RhfTextField, RhfTextareaField, RhfResourceSelect } from "@/shared/components/form"
import { DEFAULT_INVOICE_LINE } from "../invoices.config"
import type { InvoiceFormValues, InvoiceFormController } from "../hooks/use-invoice-form"
import { InvoiceLineRow } from "./invoice-line-row"

// ── Types ──────────────────────────────────────────────────────────────────────

type InvoiceFormProps = {
    ctrl: InvoiceFormController
}

// ── Header fields ──────────────────────────────────────────────────────────────

function InvoiceHeaderFields({ disabled }: { disabled: boolean }) {
    const t = useTranslations("business.resources.invoices")

    return (
        <div className="space-y-4">
            <RhfResourceSelect<InvoiceFormValues, "invoiceTypeId", InvoiceTypesClient, string>
                name="invoiceTypeId"
                label={t("invoiceType")}
                client={(api) => api["invoice-types"]}
                getLabel={(it) => `${(it as { code?: string }).code ?? ""} — ${(it as { name?: { en?: string; ar?: string } }).name?.en ?? (it as { name?: { ar?: string } }).name?.ar ?? ""}`}
                getValue={(it) => it.id as string}
                required
                disabled={disabled}
            />
            <div className="grid grid-cols-2 gap-3">
                <RhfTextField
                    name="date"
                    label={t("date")}
                    type="date"
                    required
                    disabled={disabled}
                />
                <RhfTextField
                    name="dueDate"
                    label={t("dueDate")}
                    type="date"
                    disabled={disabled}
                />
            </div>
            <RhfResourceSelect<InvoiceFormValues, "partyId", PartiesClient, string>
                name="partyId"
                label={t("party")}
                client={(api) => api.parties}
                getLabel={(it) => it.name as string}
                getValue={(it) => it.id as string}
                required
                disabled={disabled}
            />
            <RhfResourceSelect<InvoiceFormValues, "warehouseId", WarehousesClient, string>
                name="warehouseId"
                label={t("warehouse")}
                client={(api) => api.warehouses}
                getLabel={(it) => it.name as string}
                getValue={(it) => it.id as string}
                disabled={disabled}
            />
            <div className="grid grid-cols-2 gap-3">
                <RhfResourceSelect<InvoiceFormValues, "fiscalPeriodId", FiscalPeriodsClient, string>
                    name="fiscalPeriodId"
                    label={t("fiscalPeriod")}
                    client={(api) => api["fiscal-periods"]}
                    getLabel={(it) => (it.name ?? it.code ?? "") as string}
                    getValue={(it) => it.id as string}
                    required
                    disabled={disabled}
                />
                <RhfResourceSelect<InvoiceFormValues, "currencyId", CurrenciesClient, string>
                    name="currencyId"
                    label={t("currency")}
                    client={(api) => api.currencies}
                    getLabel={(it) => `${(it as { code?: string }).code ?? ""} — ${(it as { name?: string }).name ?? ""}`}
                    getValue={(it) => it.id as string}
                    required
                    disabled={disabled}
                />
            </div>
            <RhfTextareaField
                name="notes"
                label={t("notes")}
                disabled={disabled}
            />
        </div>
    )
}

// ── Line items table ───────────────────────────────────────────────────────────

function InvoiceLineItems({ ctrl }: { ctrl: InvoiceFormController }) {
    const t = useTranslations("business.resources.invoices")
    const { fields, append, remove, form, direction, isReadOnly, isBusy, isPending } = ctrl
    const disabled = isReadOnly || isBusy || isPending

    return (
        <div className="flex flex-col gap-3">
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.item")}</th>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.unit")}</th>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.quantity")}</th>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.unitPrice")}</th>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.discountPercent")}</th>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.taxPercent")}</th>
                            <th className="px-2 py-2 text-end text-xs font-medium text-muted-foreground">{t("lines.total")}</th>
                            <th className="w-8" />
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, index) => (
                            <InvoiceLineRow
                                key={field.id}
                                index={index}
                                control={form.control}
                                setValue={form.setValue}
                                getValues={form.getValues}
                                direction={direction}
                                onRemove={() => remove(index)}
                                disabled={disabled}
                            />
                        ))}
                        {fields.length === 0 && (
                            <tr>
                                <td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                                    No lines. Click &quot;Add line&quot; to start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {!isReadOnly && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => append({ ...DEFAULT_INVOICE_LINE })}
                >
                    <PlusIcon className="me-1.5 h-3.5 w-3.5" />
                    {t("lines.addLine")}
                </Button>
            )}
        </div>
    )
}

// ── Main form ──────────────────────────────────────────────────────────────────

export function InvoiceForm({ ctrl }: InvoiceFormProps) {
    const disabled = ctrl.isReadOnly || ctrl.isBusy

    return (
        <Rhform form={ctrl.form} onSubmit={ctrl.onSubmit}>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <InvoiceHeaderFields disabled={disabled} />
                <InvoiceLineItems ctrl={ctrl} />
            </div>
        </Rhform>
    )
}
```

> **Note on `getLabel` for `invoice-types`, `currencies`:** `InvoiceTypesClient.list()` and `CurrenciesClient.list()` return `any` internally (they use `as any` casts in their client implementations). `ResourceItem<InvoiceTypesClient>` is therefore `BaseCrudItem & never`, i.e. `{ id: string }`. To access `code`/`name` we narrow via an inline cast `(it as { code?: string })`. This is the tightest cast possible given the client's internal `any` — it is **not** a `as any` escape; it asserts a concrete interface.

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/dashboard && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors. If `it.name` on `PartiesClient`/`WarehousesClient` items does not resolve, apply the same narrow cast pattern: `(it as { id: string; name: string })`.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/invoices/components/invoice-form.tsx
git commit -m "feat(invoices): add standalone InvoiceForm component (header fields + line items)"
```

---

## Task 6: Refactor `invoice-form-modal.tsx`

Replace the 520-line monolith with a ~70-line dialog shell. Public props API (`open`, `onClose`, `invoiceId`, `direction`, `onSuccess`) is **unchanged** — `invoices-page.tsx` needs no edits.

**Files:**
- Replace: `apps/dashboard/modules/invoices/components/invoice-form-modal.tsx`

- [ ] **Step 1: Replace the file entirely**

```tsx
"use client"

import { useTranslations } from "next-intl"
import { SendIcon, XCircleIcon, XIcon } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { useInvoiceForm } from "../hooks/use-invoice-form"
import type { InvoiceDirection } from "../invoices.config"
import { InvoiceStatusBadge } from "./invoice-status-badge"
import { InvoiceForm } from "./invoice-form"

// ── Types ──────────────────────────────────────────────────────────────────────

type InvoiceFormModalProps = {
    open: boolean
    onClose: () => void
    invoiceId: string | null
    direction: InvoiceDirection
    onSuccess?: () => void
}

// ── Modal ──────────────────────────────────────────────────────────────────────

export function InvoiceFormModal({
    open,
    onClose,
    invoiceId,
    direction,
    onSuccess,
}: InvoiceFormModalProps) {
    const t = useTranslations("business.resources.invoices")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useInvoiceForm({ invoiceId, direction, open, onSuccess, onClose })

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent
                showCloseButton={false}
                aria-describedby={undefined}
                className="inset-0 translate-x-0 rtl:translate-x-0 translate-y-0 max-w-none sm:max-w-none h-screen max-h-screen rounded-none flex flex-col p-0 gap-0"
            >
                <DialogDescription className="sr-only">
                    {ctrl.isEditing ? (ctrl.invoiceNumber ?? t("entity")) : t("newInvoice")}
                </DialogDescription>

                {/* Zone 1 — Sticky header */}
                <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="font-mono font-semibold text-base">
                            {ctrl.isEditing && ctrl.invoiceNumber ? ctrl.invoiceNumber : t("newInvoice")}
                        </DialogTitle>
                        <InvoiceStatusBadge status={ctrl.status} />
                    </div>
                    <div className="flex items-center gap-2">
                        {ctrl.status === "DRAFT" && ctrl.isEditing && (
                            <Button type="button" size="sm" onClick={ctrl.postInvoice} disabled={ctrl.isPending}>
                                <SendIcon className="me-1.5 h-3.5 w-3.5" />
                                {t("actions.post")}
                            </Button>
                        )}
                        {ctrl.status === "POSTED" && ctrl.isEditing && (
                            <Button type="button" size="sm" variant="destructive" onClick={ctrl.cancelInvoice} disabled={ctrl.isPending}>
                                <XCircleIcon className="me-1.5 h-3.5 w-3.5" />
                                {t("actions.cancel")}
                            </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
                            <XIcon className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                </div>

                {/* Zone 2 — Scrollable body */}
                <div className="flex-1 overflow-y-auto">
                    <InvoiceForm ctrl={ctrl} />
                </div>

                {/* Zone 3 — Sticky footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30 shrink-0">
                    <div>
                        {!ctrl.isEditing && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => ctrl.form.reset()}
                                disabled={ctrl.isPending}
                            >
                                {tf("discard")}
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-sm tabular-nums">
                            <span className="text-muted-foreground">
                                {t("totals.subtotal")}:{" "}
                                <span className="text-foreground font-medium">
                                    {ctrl.totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </span>
                            {ctrl.totals.discountAmount > 0 && (
                                <span className="text-muted-foreground">
                                    {t("totals.discount")}:{" "}
                                    <span className="text-foreground font-medium">
                                        -{ctrl.totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </span>
                            )}
                            {ctrl.totals.taxAmount > 0 && (
                                <span className="text-muted-foreground">
                                    {t("totals.tax")}:{" "}
                                    <span className="text-foreground font-medium">
                                        {ctrl.totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </span>
                            )}
                            <span className="font-semibold text-base">
                                {t("totals.total")}: {ctrl.totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {!ctrl.isReadOnly && (
                            <Button
                                type="button"
                                onClick={ctrl.onSubmit}
                                disabled={ctrl.isBusy}
                            >
                                {ctrl.isBusy
                                    ? (ctrl.isEditing ? tf("updating") : tf("creating"))
                                    : (ctrl.isEditing
                                        ? tf("update", { entity: t("entity") })
                                        : tf("create", { entity: t("entity") }))}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
```

> **`tf("discard")`** — check that the `system.resourceForm` i18n namespace has a `"discard"` key. If not, use the string `"Discard"` directly and add the key to `messages/en.json`, `ar.json`, `tr.json` in a separate commit.

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/dashboard && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/modules/invoices/components/invoice-form-modal.tsx
git commit -m "refactor(invoices): replace 520-line modal monolith with thin dialog wrapper (~70 lines)"
```

---

## Task 7: Update hook and module barrel exports

Wire up the new hook and new form component through the existing export files.

**Files:**
- Modify: `apps/dashboard/modules/invoices/hooks/index.ts`
- Modify: `apps/dashboard/modules/invoices/index.ts`

- [ ] **Step 1: Update `hooks/index.ts`**

```ts
export { useInvoiceActions } from "./use-invoice-actions"
export { useInvoicesResource } from "./use-invoices-resource"
export { useInvoiceForm } from "./use-invoice-form"
export type { InvoiceFormController, UseInvoiceFormOptions } from "./use-invoice-form"
export type { InvoicesResourceContext } from "./use-invoices-resource"
```

- [ ] **Step 2: Update `index.ts`**

Add `InvoiceForm` and the new types to the barrel. The complete file:

```ts
export { InvoicesPage } from "./components/invoices-page"
export { InvoiceFormModal } from "./components/invoice-form-modal"
export { InvoiceForm } from "./components/invoice-form"
export { InvoiceStatusBadge } from "./components/invoice-status-badge"
export { createInvoicesColumns } from "./components/invoices-columns"
export type { InvoiceColumnActions } from "./components/invoices-columns"
export { InvoicesResource } from "./invoices.resource"
export { useInvoiceActions, useInvoicesResource, useInvoiceForm } from "./hooks"
export type { InvoicesResourceContext, InvoiceFormController } from "./hooks"
export {
    invoiceFormSchema,
    invoiceLineSchema,
    DEFAULT_INVOICE_FORM_VALUES,
    DEFAULT_INVOICE_LINE,
    mapInvoiceToFormValues,
    toCreateInvoiceDto,
    toUpdateInvoiceDto,
    computeInvoiceTotals,
    computeLineTotals,
} from "./invoices.config"
export type {
    InvoiceFormValues,
    InvoiceLineFormValues,
    InvoiceDirection,
    InvoiceItemOption,
    InvoiceTotals,
    InvoiceStatus,
} from "./invoices.config"
```

- [ ] **Step 3: Final TypeScript check**

```bash
cd apps/dashboard && pnpm tsc --noEmit --project tsconfig.json 2>&1 | head -50
```

Expected: zero errors across the entire dashboard.

- [ ] **Step 4: Check for leftover `any` in the module**

```bash
grep -rn "as any\|: any" apps/dashboard/modules/invoices/
```

Expected output should contain **zero** matches in our new files. The only acceptable hits are inside `invoices-columns.tsx` (which is untouched) if it has any.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/modules/invoices/hooks/index.ts apps/dashboard/modules/invoices/index.ts
git commit -m "chore(invoices): update barrel exports for new hook and form components"
```

---

## Task 8: Check i18n key `discard`

If `tf("discard")` in the modal footer caused a type error in Task 6, add the missing key.

**Files:**
- Modify: `apps/dashboard/messages/en.json`
- Modify: `apps/dashboard/messages/ar.json`
- Modify: `apps/dashboard/messages/tr.json`

- [ ] **Step 1: Check if `discard` key exists**

```bash
grep -n "discard" apps/dashboard/messages/en.json
```

If it prints a line → skip this task entirely.

- [ ] **Step 2: If missing, add to each locale file under `system.resourceForm`**

In `en.json`:
```json
"discard": "Discard"
```

In `ar.json`:
```json
"discard": "تجاهل"
```

In `tr.json`:
```json
"discard": "Vazgeç"
```

- [ ] **Step 3: Revert hard-coded string in modal if you used it as a workaround**

Change `"Discard"` back to `{tf("discard")}` in `invoice-form-modal.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/messages/en.json apps/dashboard/messages/ar.json apps/dashboard/messages/tr.json apps/dashboard/modules/invoices/components/invoice-form-modal.tsx
git commit -m "i18n: add discard key to resourceForm namespace"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Covered by |
|---|---|
| `InvoiceStatus` imported from contracts | Task 1 |
| `InvoiceItemOption` interface | Task 1 |
| `InvoiceDirection` moved to config | Task 1 |
| `InvoiceTotals` named return type | Task 1 |
| `InvoiceLineApiData` fixes `line: any` in mapper | Task 1 |
| `InvoiceStatusBadge` atom | Task 2 |
| `useInvoiceForm` controller hook | Task 3 |
| `CachedInvoiceEntry` typed cache read | Task 3 |
| `InvoiceLineRow` with `Control`/`setValue`/`getValues` | Task 4 |
| Item select fully typed via `ResourceItem<ItemsClient>` | Task 4 |
| Standalone `InvoiceForm` | Task 5 |
| `InvoiceFormModal` thin wrapper | Task 6 |
| Barrel exports updated | Task 7 |
| Zero `any` in module code | Task 7 (verified by grep) |
| `invoices-page.tsx` unchanged | No task needed — props preserved |

**No placeholders found.**

**Type consistency:** All types defined in Task 1 (`InvoiceFormController`, `InvoiceItemOption`, `InvoiceDirection`, `InvoiceTotals`) are used with identical names in Tasks 2–7.
