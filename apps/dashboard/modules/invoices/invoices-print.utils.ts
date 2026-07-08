import { CONSTANTS } from "@/config/constants"
import type { InvoiceDirection } from "./invoices.config"

export function getInvoicePrintPath(locale: string, direction: InvoiceDirection, invoiceId: string): string {
    const segment = direction === "SALE" ? "sales" : "purchases"
    return `/${locale}/${segment}/invoices/${invoiceId}/print`
}

export function resolveTenantLogoUrl(logo: string | null | undefined): string | null {
    if (!logo?.trim()) return null
    if (logo.startsWith("http://") || logo.startsWith("https://")) return logo
    return CONSTANTS.getAssetUrl(logo.replace(/^\//, ""))
}

export function formatPrintDate(iso: string | null | undefined, dateFormat?: string): string {
    if (!iso) return "—"
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return "—"

    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")

    switch (dateFormat) {
        case "DD/MM/YYYY":
            return `${d}/${m}/${y}`
        case "MM/DD/YYYY":
            return `${m}/${d}/${y}`
        default:
            return `${y}-${m}-${d}`
    }
}

export function formatPrintAmount(value: number, currencyCode?: string, currencySymbol?: string): string {
    const formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
    const suffix = currencySymbol || currencyCode || ""
    return suffix ? `${formatted} ${suffix}` : formatted
}
