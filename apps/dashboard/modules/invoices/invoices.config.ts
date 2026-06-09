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
