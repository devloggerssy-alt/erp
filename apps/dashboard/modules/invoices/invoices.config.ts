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

        // must support string numbers
        latestPurchasePrice: z.coerce.number().nullable().optional(),
        defaultSellingPrice: z.coerce.number().nullable().optional(),
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

// ── Relational field type ──────────────────────────────────────────────────────

// Relational selects store the full API item object so the combobox can display
// the label without a separate fetch. Only `id` is guaranteed to be present;
// all other API fields come along for free.
export type InvoiceRelationalField = { id: string }

// passthrough() lets extra API fields through at runtime; nullable() allows the
// empty (unselected) state. superRefine below enforces required fields on submit.
const relational = z.object({ id: z.string() }).passthrough().nullable()
const optionalRelational = relational.optional()

// ── Invoice form schema ────────────────────────────────────────────────────────

export const invoiceFormSchema = z.object({
    invoiceType: relational,
    date: z.string().min(1, "Date is required"),
    dueDate: z.string().optional(),
    party: relational,
    warehouse: optionalRelational,
    fiscalPeriod: relational,
    currency: relational,
    notes: z.string().optional(),
    lines: z.array(invoiceLineSchema).min(1, "At least one line is required"),
}).superRefine((data, ctx) => {
    const required = [
        ["invoiceType", "Invoice type is required"],
        ["party", "Party is required"],
        ["fiscalPeriod", "Fiscal period is required"],
        ["currency", "Currency is required"],
    ] as const
    for (const [key, msg] of required) {
        if (!data[key]) {
            ctx.addIssue({ code: "custom", path: [key], message: msg })
        }
    }
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
    invoiceType: null,
    date: new Date().toISOString().split("T")[0]!,
    dueDate: "",
    party: null,
    warehouse: null,
    fiscalPeriod: null,
    currency: null,
    notes: "",
    lines: [{ ...DEFAULT_INVOICE_LINE }],
}

// ── Mapper ─────────────────────────────────────────────────────────────────────

interface InvoiceApiResponse {
    invoiceTypeId?: string
    date?: string
    dueDate?: string
    partyId?: string
    warehouseId?: string
    fiscalPeriodId?: string
    currencyId?: string
    notes?: string
    lines?: InvoiceLineApiData[]
}

export function mapInvoiceToFormValues(data: unknown): InvoiceFormValues {
    const resolved = unwrapApiData<InvoiceApiResponse>(data)
    return {
        // Store minimal objects — combobox syncs label from options once they load
        invoiceType: resolved?.invoiceTypeId ? { id: resolved.invoiceTypeId } : null,
        date: resolved?.date ? new Date(resolved.date).toISOString().split("T")[0]! : "",
        dueDate: resolved?.dueDate ? new Date(resolved.dueDate).toISOString().split("T")[0]! : "",
        party: resolved?.partyId ? { id: resolved.partyId } : null,
        warehouse: resolved?.warehouseId ? { id: resolved.warehouseId } : null,
        fiscalPeriod: resolved?.fiscalPeriodId ? { id: resolved.fiscalPeriodId } : null,
        currency: resolved?.currencyId ? { id: resolved.currencyId } : null,
        notes: resolved?.notes ?? "",
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
        invoiceTypeId: values.invoiceType?.id ?? "",
        date: values.date,
        dueDate: values.dueDate || undefined,
        partyId: values.party?.id ?? "",
        warehouseId: values.warehouse?.id || undefined,
        fiscalPeriodId: values.fiscalPeriod?.id ?? "",
        currencyId: values.currency?.id ?? "",
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
        partyId: values.party?.id ?? "",
        warehouseId: values.warehouse?.id || undefined,
        currencyId: values.currency?.id ?? "",
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
