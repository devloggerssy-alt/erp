import { z } from "zod"
import { getDefaults } from "@devloggers/api-contracts"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

const registryDefaults = getDefaults()

// ── Company Profile ──
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  legalName: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  website: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  logo: z.string().trim().optional(),
})
export type ProfileFormValues = z.infer<typeof profileSchema>

export const DEFAULT_PROFILE_VALUES: ProfileFormValues = {
  name: "", legalName: "", taxNumber: "", website: "",
  address: "", phone: "", email: "", logo: "",
}

export function mapTenantToProfileValues(data: unknown): ProfileFormValues {
  const t = unwrapApiData<Record<string, unknown>>(data)
  const s = (k: string) => (typeof t[k] === "string" ? (t[k] as string) : "")
  return {
    name: s("name"), legalName: s("legalName"), taxNumber: s("taxNumber"),
    website: s("website"), address: s("address"), phone: s("phone"),
    email: s("email"), logo: s("logo"),
  }
}

// ── Localization ──
export const localizationSchema = z.object({
  timezone: z.string().trim().min(1),
  locale: z.enum(["en", "ar", "tr"]),
  dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]),
  numberFormat: z.enum(["1,234.56", "1.234,56"]),
  firstDayOfWeek: z.coerce.number().int().min(0).max(6),
})
export type LocalizationFormValues = z.infer<typeof localizationSchema>

export const DEFAULT_LOCALIZATION_VALUES: LocalizationFormValues = {
  timezone: registryDefaults.timezone as string,
  locale: registryDefaults.locale as "en" | "ar" | "tr",
  dateFormat: registryDefaults.dateFormat as LocalizationFormValues["dateFormat"],
  numberFormat: registryDefaults.numberFormat as LocalizationFormValues["numberFormat"],
  firstDayOfWeek: registryDefaults.firstDayOfWeek as number,
}

function localizationGroup(data: unknown): Record<string, unknown> {
  const root = unwrapApiData<{ localization?: Record<string, unknown> }>(data)
  return root.localization ?? {}
}

export function mapSettingsToLocalizationValues(data: unknown): LocalizationFormValues {
  const g = localizationGroup(data)
  return {
    timezone: (g.timezone as string) ?? DEFAULT_LOCALIZATION_VALUES.timezone,
    locale: (g.locale as LocalizationFormValues["locale"]) ?? DEFAULT_LOCALIZATION_VALUES.locale,
    dateFormat: (g.dateFormat as LocalizationFormValues["dateFormat"]) ?? DEFAULT_LOCALIZATION_VALUES.dateFormat,
    numberFormat: (g.numberFormat as LocalizationFormValues["numberFormat"]) ?? DEFAULT_LOCALIZATION_VALUES.numberFormat,
    firstDayOfWeek: (g.firstDayOfWeek as number) ?? DEFAULT_LOCALIZATION_VALUES.firstDayOfWeek,
  }
}

// ── Financial (scalars only; FK defaults handled by the form via tenant) ──
export const financialSchema = z.object({
  baseCurrencyId: z.string().optional(),
  defaultSalesSequenceId: z.string().optional(),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  roundingPrecision: z.coerce.number().int().min(0).max(6),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
})
export type FinancialFormValues = z.infer<typeof financialSchema>

export const DEFAULT_FINANCIAL_VALUES: FinancialFormValues = {
  baseCurrencyId: "", defaultSalesSequenceId: "",
  defaultTaxRate: registryDefaults.defaultTaxRate as number,
  roundingPrecision: registryDefaults.roundingPrecision as number,
  fiscalYearStartMonth: registryDefaults.fiscalYearStartMonth as number,
}

export function mapToFinancialValues(tenant: unknown, settings: unknown): FinancialFormValues {
  const t = unwrapApiData<Record<string, unknown>>(tenant)
  const g = (unwrapApiData<{ financial?: Record<string, unknown> }>(settings).financial) ?? {}
  return {
    baseCurrencyId: (t.baseCurrencyId as string) ?? "",
    defaultSalesSequenceId: (t.defaultSalesSequenceId as string) ?? "",
    defaultTaxRate: (g.defaultTaxRate as number) ?? DEFAULT_FINANCIAL_VALUES.defaultTaxRate,
    roundingPrecision: (g.roundingPrecision as number) ?? DEFAULT_FINANCIAL_VALUES.roundingPrecision,
    fiscalYearStartMonth: (g.fiscalYearStartMonth as number) ?? DEFAULT_FINANCIAL_VALUES.fiscalYearStartMonth,
  }
}

// ── Documents ──
export const documentsSchema = z.object({
  invoiceDefaultNotes: z.string().max(2000).optional(),
  invoiceDefaultTerms: z.string().max(2000).optional(),
  documentFooter: z.string().max(2000).optional(),
  showLogoOnDocuments: z.boolean(),
})
export type DocumentsFormValues = z.infer<typeof documentsSchema>

export const DEFAULT_DOCUMENTS_VALUES: DocumentsFormValues = {
  invoiceDefaultNotes: registryDefaults.invoiceDefaultNotes as string,
  invoiceDefaultTerms: registryDefaults.invoiceDefaultTerms as string,
  documentFooter: registryDefaults.documentFooter as string,
  showLogoOnDocuments: registryDefaults.showLogoOnDocuments as boolean,
}

export function mapSettingsToDocumentsValues(data: unknown): DocumentsFormValues {
  const g = (unwrapApiData<{ documents?: Record<string, unknown> }>(data).documents) ?? {}
  return {
    invoiceDefaultNotes: (g.invoiceDefaultNotes as string) ?? "",
    invoiceDefaultTerms: (g.invoiceDefaultTerms as string) ?? "",
    documentFooter: (g.documentFooter as string) ?? "",
    showLogoOnDocuments: typeof g.showLogoOnDocuments === "boolean" ? (g.showLogoOnDocuments as boolean) : true,
  }
}
