"use client"

import { useLocale, useTranslations } from "next-intl"
import { PrinterIcon, SendIcon, XCircleIcon, XIcon } from "lucide-react"
import { DialogDescription, DialogTitle } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { useInvoiceDialog } from "./invoice-dialog-context"
import { InvoiceStatusBadge } from "./invoice-status-badge"
import { InvoicePaidStatusBadge } from "./invoice-paid-status-badge"
import { getInvoicePrintPath } from "../invoices-print.utils"

export function InvoiceDialogHeader() {
    const locale = useLocale()
    const t = useTranslations("business.resources.invoices")
    const { ctrl, close } = useInvoiceDialog()

    return (
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
            <DialogDescription className="sr-only">
                {ctrl.isEditing ? (ctrl.invoiceNumber ?? t("entity")) : t("newInvoice")}
            </DialogDescription>

            <div className="flex items-center gap-3">
                <DialogTitle className="ltr:font-mono font-semibold text-base">
                    {ctrl.isEditing && ctrl.invoiceNumber ? ctrl.invoiceNumber : t("newInvoice")}
                </DialogTitle>
                <InvoiceStatusBadge status={ctrl.status} />
                <InvoicePaidStatusBadge status={ctrl.paidStatus} invoiceStatus={ctrl.status} />
            </div>

            <div className="flex items-center gap-2">
                {ctrl.isEditing && ctrl.invoiceId && (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(
                            getInvoicePrintPath(locale, ctrl.direction, ctrl.invoiceId!),
                            "_blank",
                            "noopener,noreferrer",
                        )}
                    >
                        <PrinterIcon className="me-1.5 h-3.5 w-3.5" />{t("actions.print")}
                    </Button>
                )}
                {ctrl.status === "DRAFT" && ctrl.isEditing && (
                    <Button type="button" size="sm" onClick={ctrl.postInvoice} disabled={ctrl.isPending}>
                        <SendIcon className="me-1.5 h-3.5 w-3.5" />{t("actions.post")}
                    </Button>
                )}
                {ctrl.status === "POSTED" && ctrl.isEditing && (
                    <Button type="button" size="sm" variant="destructive" onClick={ctrl.cancelInvoice} disabled={ctrl.isPending}>
                        <XCircleIcon className="me-1.5 h-3.5 w-3.5" />{t("actions.cancel")}
                    </Button>
                )}
                <Button type="button" variant="ghost" size="icon-sm" onClick={close}>
                    <XIcon className="h-4 w-4" /><span className="sr-only">Close</span>
                </Button>
            </div>
        </div>
    )
}
