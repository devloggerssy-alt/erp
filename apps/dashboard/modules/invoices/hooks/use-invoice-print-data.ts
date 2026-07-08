"use client"

import { useQuery } from "@tanstack/react-query"
import { invoiceResource, tenantResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"
import type { CrudShowResponse, InvoicesClient } from "@devloggers/api-client"

export type InvoicePrintLine = {
    id: string
    itemCode?: string
    itemName?: string
    unitAbbreviation?: string
    unitName?: string
    quantity: number
    unitPrice: number
    discountPercent: number
    discountAmount: number
    taxPercent: number
    taxAmount: number
    total: number
    notes?: string | null
}

export type InvoicePrintPayment = {
    id: string
    paymentNumber: string
    amount: number
    date: string
}

export type InvoicePrintData = {
    id: string
    number: string
    status: string
    invoiceTypeName?: string
    invoiceTypeDirection?: string
    date: string
    dueDate: string | null
    partyName?: string
    partyAddress?: string | null
    partyPhone?: string | null
    partyEmail?: string | null
    warehouseName?: string
    currencyCode?: string
    currencySymbol?: string
    exchangeRate: number
    subtotal: number
    discountAmount: number
    taxAmount: number
    total: number
    notes: string | null
    amountPaid: number
    balanceDue: number
    paidStatus?: string
    lines: InvoicePrintLine[]
    payments: InvoicePrintPayment[]
}

export type TenantPrintProfile = {
    name: string
    legalName: string | null
    taxNumber: string | null
    address: string | null
    phone: string | null
    email: string | null
    website: string | null
    logo: string | null
}

export type DocumentPrintSettings = {
    documentFooter: string
    invoiceDefaultTerms: string
    showLogoOnDocuments: boolean
    dateFormat: string
}

type InvoiceDetail = NonNullable<CrudShowResponse<InvoicesClient>["data"]>

function mapInvoice(data: Partial<InvoiceDetail> & { id: string; number: string }): InvoicePrintData {
    return {
        id: data.id,
        number: data.number,
        status: data.status ?? "DRAFT",
        invoiceTypeName: data.invoiceTypeName,
        invoiceTypeDirection: data.invoiceTypeDirection,
        date: data.date ?? "",
        dueDate: data.dueDate ?? null,
        partyName: data.partyName,
        partyAddress: (data as { partyAddress?: string | null }).partyAddress ?? null,
        partyPhone: (data as { partyPhone?: string | null }).partyPhone ?? null,
        partyEmail: (data as { partyEmail?: string | null }).partyEmail ?? null,
        warehouseName: data.warehouseName,
        currencyCode: data.currencyCode,
        currencySymbol: (data as { currencySymbol?: string }).currencySymbol,
        exchangeRate: data.exchangeRate ?? 1,
        subtotal: data.subtotal ?? 0,
        discountAmount: data.discountAmount ?? 0,
        taxAmount: data.taxAmount ?? 0,
        total: data.total ?? 0,
        notes: data.notes ?? null,
        amountPaid: data.amountPaid ?? 0,
        balanceDue: data.balanceDue ?? 0,
        paidStatus: data.paidStatus,
        lines: (data.lines ?? []).map((line) => ({
            id: line.id,
            itemCode: line.itemCode,
            itemName: line.itemName,
            unitAbbreviation: line.unitAbbreviation,
            unitName: line.unitName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            discountAmount: line.discountAmount,
            taxPercent: line.taxPercent,
            taxAmount: line.taxAmount,
            total: line.total,
            notes: line.notes,
        })),
        payments: (data.payments ?? []).map((payment) => ({
            id: payment.id,
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            date: payment.date,
        })),
    }
}

export function useInvoicePrintData(invoiceId: string) {
    const api = useApi()

    return useQuery({
        queryKey: [invoiceResource.key, "print", invoiceId],
        queryFn: async () => {
            const [invoiceRes, tenantRes, settingsRes] = await Promise.all([
                api.invoices.show(invoiceId),
                api.tenants.current(),
                api.tenants.getSettings(),
            ])

            const invoiceRaw = unwrapApiData<InvoiceDetail>(invoiceRes)
            if (!invoiceRaw.id || !invoiceRaw.number) {
                throw new Error("Invoice not found")
            }

            const invoice = mapInvoice(invoiceRaw as Partial<InvoiceDetail> & { id: string; number: string })
            const tenantRaw = unwrapApiData<TenantPrintProfile>(tenantRes)
            const tenant: TenantPrintProfile = {
                name: tenantRaw.name ?? "",
                legalName: tenantRaw.legalName ?? null,
                taxNumber: tenantRaw.taxNumber ?? null,
                address: tenantRaw.address ?? null,
                phone: tenantRaw.phone ?? null,
                email: tenantRaw.email ?? null,
                website: tenantRaw.website ?? null,
                logo: tenantRaw.logo ?? null,
            }
            const settings = settingsRes as {
                localization?: { dateFormat?: string }
                documents?: {
                    documentFooter?: string
                    invoiceDefaultTerms?: string
                    showLogoOnDocuments?: boolean
                }
            }

            const documents: DocumentPrintSettings = {
                documentFooter: settings.documents?.documentFooter ?? "",
                invoiceDefaultTerms: settings.documents?.invoiceDefaultTerms ?? "",
                showLogoOnDocuments: settings.documents?.showLogoOnDocuments ?? true,
                dateFormat: settings.localization?.dateFormat ?? "YYYY-MM-DD",
            }

            return { invoice, tenant, documents }
        },
        enabled: Boolean(invoiceId),
    })
}

export const INVOICE_PRINT_QUERY_KEY = [invoiceResource.key, "print"] as const
export const TENANT_PRINT_QUERY_KEY = [tenantResource.routes.current] as const
