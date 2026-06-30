import { z } from "zod"

// ── Step 1: Company ──────────────────────────────────────────────────────────

export const companyStepSchema = z.object({
    name: z.string().trim().min(1, "Company name is required"),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    locale: z.enum(["en", "ar", "tr"]),
    timezone: z.string().min(1, "Timezone is required"),
    dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]),
    numberFormat: z.enum(["1,234.56", "1.234,56"]),
})
export type CompanyStepValues = z.infer<typeof companyStepSchema>

export const DEFAULT_COMPANY_VALUES: CompanyStepValues = {
    name: "",
    locale: "en",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD",
    numberFormat: "1,234.56",
}

// ── Step 2: Fiscal Year ──────────────────────────────────────────────────────

const currentYear = new Date().getFullYear()

export const fiscalYearStepSchema = z.object({
    name: z.string().trim().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
})
export type FiscalYearStepValues = z.infer<typeof fiscalYearStepSchema>

export const DEFAULT_FISCAL_YEAR_VALUES: FiscalYearStepValues = {
    name: `FY ${currentYear}`,
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
}

// ── Step 4: GL Defaults ──────────────────────────────────────────────────────

export const glDefaultsStepSchema = z.object({
    defaultSalesAccountId: z.string().uuid("Select a sales account"),
    defaultPurchaseAccountId: z.string().uuid("Select a purchase account"),
    defaultTaxAccountId: z.string().uuid("Select a tax account"),
    defaultReceivableAccountId: z.string().uuid("Select a receivable account"),
    defaultPayableAccountId: z.string().uuid("Select a payable account"),
})
export type GlDefaultsStepValues = z.infer<typeof glDefaultsStepSchema>

// ── Step 5: Document Sequences ───────────────────────────────────────────────

export const DEFAULT_SEQUENCES = [
    { type: "SALES_INVOICE",    prefix: "INV-", startNumber: 1, padLength: 5 },
    { type: "PURCHASE_INVOICE", prefix: "PUR-", startNumber: 1, padLength: 5 },
    { type: "PAYMENT",          prefix: "PAY-", startNumber: 1, padLength: 5 },
    { type: "RECEIPT",          prefix: "REC-", startNumber: 1, padLength: 5 },
    { type: "EXPENSE",          prefix: "EXP-", startNumber: 1, padLength: 5 },
    { type: "STOCK_ADJUSTMENT", prefix: "STK-", startNumber: 1, padLength: 5 },
    { type: "JOURNAL",          prefix: "JNL-", startNumber: 1, padLength: 5 },
]

export const sequenceItemSchema = z.object({
    type: z.string(),
    prefix: z.string().min(1, "Prefix is required"),
    startNumber: z.number().int().min(1),
    padLength: z.number().int().min(1),
})

export const documentSequencesStepSchema = z.object({
    sequences: z.array(sequenceItemSchema),
})
export type DocumentSequencesStepValues = z.infer<typeof documentSequencesStepSchema>

export const DEFAULT_DOCUMENT_SEQUENCES_VALUES: DocumentSequencesStepValues = {
    sequences: DEFAULT_SEQUENCES,
}

// ── GL pre-fill map — code → recommended field ────────────────────────────────

export const GL_DEFAULT_CODES: Record<keyof GlDefaultsStepValues, string> = {
    defaultSalesAccountId:      "4100",
    defaultPurchaseAccountId:   "5100",
    defaultTaxAccountId:        "2140",
    defaultReceivableAccountId: "1120",
    defaultPayableAccountId:    "2110",
}
