import { z } from "zod"
import type { InvoiceStatus } from "@devloggers/api-contracts"
import { invoiceResource, type ApiRequestBody } from "@devloggers/api-contracts"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

type CreateInvoiceBody = ApiRequestBody<typeof invoiceResource.routes.create, "post">
type UpdateInvoiceBody = ApiRequestBody<typeof invoiceResource.routes.update, "patch">
import type { CrudListDataItem, CrudShowResponse, InvoicesClient, ItemsClient, UnitsClient } from "@devloggers/api-client"

// Detail (show) response shape, derived from the typed API contract — the single
// source of truth for what `api.invoices.show()` returns.
type InvoiceDetail = NonNullable<CrudShowResponse<InvoicesClient>["data"]>
type InvoiceDetailLine = NonNullable<InvoiceDetail["lines"]>[number]

// Re-export InvoiceStatus from contracts so module consumers have one import point
export type { InvoiceStatus }

// ── Shared types ───────────────────────────────────────────────────────────────

export type InvoiceDirection = "SALE" | "PURCHASE"

/** Full item object stored in the virtual _item field before mapping to itemId. */
export type InvoiceItemOption = CrudListDataItem<ItemsClient>

/** Full unit object stored in the virtual _unit field before mapping to unitId. */
export type InvoiceUnitOption = CrudListDataItem<UnitsClient>

/** Named return type for computeInvoiceTotals */
export interface InvoiceTotals {
    subtotal: number
    discountAmount: number
    taxAmount: number
    total: number
}

// ── Line item schema ───────────────────────────────────────────────────────────

export const invoiceLineSchema = z.object({
    _item: z.object({
        id: z.string(),
        name: z.string().optional(),
        code: z.string().optional(),
        baseUnitId: z.string().optional(),
        latestPurchasePrice: z.coerce.number().nullable().optional(),
        defaultSellingPrice: z.coerce.number().nullable().optional(),
    }).nullable().optional(),
    _unit: z.object({ id: z.string() }).passthrough().nullable().optional(),
    itemId: z.string().min(1, "validation.itemRequired"),
    quantity: z.coerce.number().min(0.0001, "Must be > 0"),
    unitPrice: z.coerce.number().min(0, "Must be ≥ 0"),
    discountPercent: z.coerce.number().min(0).max(100).default(0),
    taxPercent: z.coerce.number().min(0).max(100).default(0),
    notes: z.string().optional(),
    sortOrder: z.number().optional(),
}).superRefine((data, ctx) => {
    if (!data._unit?.id) {
        ctx.addIssue({ code: "custom", path: ["_unit"], message: "validation.unitRequired" })
    }
})

export type InvoiceLineFormValues = z.infer<typeof invoiceLineSchema>

// ── Relational field type ──────────────────────────────────────────────────────

export type InvoiceRelationalField = { id: string }

// passthrough() lets extra API fields through at runtime; nullable() allows the
// empty (unselected) state. superRefine below enforces required fields on submit.
const relational = z.object({ id: z.string() }).passthrough().nullable()
const optionalRelational = relational.optional()

// ── Invoice form schema ────────────────────────────────────────────────────────

export const invoiceFormSchema = z.object({
    invoiceType: relational,
    date: z.string().min(1, "validation.dateRequired"),
    dueDate: z.string().optional(),
    party: relational,
    warehouse: optionalRelational,
    branch: relational,
    fiscalPeriod: relational,
    currency: relational,
    exchangeRate: z.coerce.number().gt(0).default(1),
    notes: z.string().optional(),
    lines: z.array(invoiceLineSchema).min(1, "validation.lineRequired"),
    openingPayment: z.boolean().default(false),
    openingPaymentCashbox: optionalRelational,
    openingPaymentAmount: z.coerce.number().min(0).optional(),
}).superRefine((data, ctx) => {
    const required = [
        ["invoiceType", "validation.invoiceTypeRequired"],
        ["party", "validation.partyRequired"],
        ["branch", "validation.branchRequired"],
        ["fiscalPeriod", "validation.fiscalPeriodRequired"],
        ["currency", "validation.currencyRequired"],
    ] as const
    for (const [key, msg] of required) {
        if (!data[key]) {
            ctx.addIssue({ code: "custom", path: [key], message: msg })
        }
    }
    if (data.openingPayment && !data.openingPaymentCashbox?.id) {
        ctx.addIssue({ code: "custom", path: ["openingPaymentCashbox"], message: "validation.openingPaymentCashboxRequired" })
    }
})

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

// ── Defaults ───────────────────────────────────────────────────────────────────

export const DEFAULT_INVOICE_LINE: InvoiceLineFormValues = {
    _item: null,
    _unit: null,
    itemId: "",
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
    branch: null,
    fiscalPeriod: null,
    currency: null,
    exchangeRate: 1,
    notes: "",
    lines: [{ ...DEFAULT_INVOICE_LINE }],
    openingPayment: false,
    openingPaymentCashbox: null,
    openingPaymentAmount: undefined,
}

// ── Mapper ─────────────────────────────────────────────────────────────────────

function mapDetailLineToFormLine(line: InvoiceDetailLine): InvoiceLineFormValues {
    return {
        _item: line.itemId ? {
            id: line.itemId,
            name: line.itemName,
            code: line.itemCode,
            baseUnitId: line.unitId,
        } : null,
        // Store full unit object so the combobox label renders before options load
        _unit: line.unitId ? { id: line.unitId, name: line.unitName, abbreviation: line.unitAbbreviation } : null,
        itemId: line.itemId ?? "",
        quantity: Number(line.quantity) || 1,
        unitPrice: Number(line.unitPrice) || 0,
        discountPercent: Number(line.discountPercent) || 0,
        taxPercent: Number(line.taxPercent) || 0,
        notes: line.notes ?? "",
        sortOrder: line.sortOrder,
    }
}

export function mapInvoiceToFormValues(data: unknown): InvoiceFormValues {
    const resolved = unwrapApiData<InvoiceDetail>(data)
    const lines = resolved?.lines?.length
        ? resolved.lines.map(mapDetailLineToFormLine)
        : [{ ...DEFAULT_INVOICE_LINE }]
    return {
        invoiceType: resolved?.invoiceTypeId ? { id: resolved.invoiceTypeId } : null,
        date: resolved?.date ? new Date(resolved.date).toISOString().split("T")[0]! : "",
        dueDate: resolved?.dueDate ? new Date(resolved.dueDate).toISOString().split("T")[0]! : "",
        party: resolved?.partyId ? { id: resolved.partyId } : null,
        warehouse: resolved?.warehouseId ? { id: resolved.warehouseId } : null,
        branch: resolved?.branchId ? { id: resolved.branchId } : null,
        fiscalPeriod: resolved?.fiscalPeriodId ? { id: resolved.fiscalPeriodId } : null,
        currency: resolved?.currencyId ? { id: resolved.currencyId } : null,
        exchangeRate: Number(resolved?.exchangeRate) || 1,
        notes: resolved?.notes ?? "",
        lines,
        // Opening payment is a create-time-only concern — never pre-filled when editing.
        openingPayment: false,
        openingPaymentCashbox: null,
        openingPaymentAmount: undefined,
    }
}

// ── Payload builders ───────────────────────────────────────────────────────────

export function toCreateInvoiceDto(values: InvoiceFormValues, options?: { complete?: boolean }): CreateInvoiceBody {
    return {
        invoiceTypeId: values.invoiceType?.id ?? "",
        date: values.date,
        dueDate: values.dueDate || undefined,
        partyId: values.party?.id ?? "",
        warehouseId: values.warehouse?.id || undefined,
        branchId: values.branch?.id ?? "",
        fiscalPeriodId: values.fiscalPeriod?.id ?? "",
        currencyId: values.currency?.id ?? "",
        exchangeRate: values.exchangeRate,
        notes: values.notes || undefined,
        complete: options?.complete ?? false,
        openingPayment: values.openingPayment && values.openingPaymentCashbox?.id
            ? {
                cashboxId: values.openingPaymentCashbox.id,
                amount: values.openingPaymentAmount ?? 0,
                exchangeRate: values.exchangeRate !== 1 ? values.exchangeRate : undefined,
            }
            : undefined,
        lines: values.lines.map((line, index) => ({
            itemId: line.itemId,
            unitId: line._unit?.id ?? "",
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            taxPercent: line.taxPercent ?? 0,
            notes: line.notes || undefined,
            sortOrder: line.sortOrder ?? index,
        })),
    }
}

export function toUpdateInvoiceDto(values: InvoiceFormValues): UpdateInvoiceBody {
    return {
        date: values.date,
        dueDate: values.dueDate || undefined,
        partyId: values.party?.id ?? "",
        warehouseId: values.warehouse?.id || undefined,
        branchId: values.branch?.id || undefined,
        currencyId: values.currency?.id ?? "",
        notes: values.notes || undefined,
        lines: values.lines.map((line, index) => ({
            itemId: line.itemId,
            unitId: line._unit?.id ?? "",
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            taxPercent: line.taxPercent ?? 0,
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
