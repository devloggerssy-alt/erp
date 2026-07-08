"use client"

import { useLocale, useTranslations } from "next-intl"
import { PrinterIcon, XIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import type { InvoiceDirection } from "../invoices.config"
import { useInvoicePrintData } from "../hooks/use-invoice-print-data"
import { InvoicePrintLayout } from "./invoice-print-layout"

type InvoicePrintPageProps = {
    invoiceId: string
    direction: InvoiceDirection
}

export function InvoicePrintPage({ invoiceId, direction }: InvoicePrintPageProps) {
    const locale = useLocale()
    const t = useTranslations("business.resources.invoices.print")
    const { data, isLoading, isError, error } = useInvoicePrintData(invoiceId)

    const listPath = direction === "SALE"
        ? `/${locale}/sales/invoices`
        : `/${locale}/purchases/invoices`

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/30">
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30">
                <p className="text-sm text-destructive">
                    {error instanceof Error ? error.message : t("loadFailed")}
                </p>
                <Button variant="outline" size="sm" onClick={() => window.close()}>
                    {t("close")}
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/30 print:bg-white">
            <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3 shadow-sm">
                <p className="text-sm font-medium">{data.invoice.number}</p>
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => window.print()}>
                        <PrinterIcon className="me-1.5 h-4 w-4" />
                        {t("print")}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            if (window.history.length > 1) window.history.back()
                            else window.location.href = listPath
                        }}
                    >
                        <XIcon className="me-1.5 h-4 w-4" />
                        {t("close")}
                    </Button>
                </div>
            </div>

            <div className="px-4 py-8 print:p-0">
                <InvoicePrintLayout
                    direction={direction}
                    invoice={data.invoice}
                    tenant={data.tenant}
                    documents={data.documents}
                />
            </div>
        </div>
    )
}
