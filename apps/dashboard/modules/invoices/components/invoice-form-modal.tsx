"use client"

import { useLocale, useTranslations } from "next-intl"
import { PrinterIcon, SendIcon, XCircleIcon, XIcon } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { useInvoiceForm } from "../hooks/use-invoice-form"
import { DEFAULT_INVOICE_FORM_VALUES, type InvoiceDirection, type InvoiceTotals } from "../invoices.config"
import { InvoiceStatusBadge } from "./invoice-status-badge"
import { InvoicePaidStatusBadge } from "./invoice-paid-status-badge"
import { InvoiceForm } from "./invoice-form"
import { getInvoicePrintPath } from "../invoices-print.utils"

// ── Types ──────────────────────────────────────────────────────────────────────

type InvoiceFormModalProps = {
    open: boolean
    onClose: () => void
    invoiceId: string | null
    direction: InvoiceDirection
    initialTypeCode: string  
    onSuccess?: () => void
}

// ── Footer totals display ──────────────────────────────────────────────────────

function ModalTotals({ totals, t }: { totals: InvoiceTotals; t: (k: string) => string, }) {
    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return (
        <div className="flex items-center gap-4 text-sm tabular-nums">
            <span className="text-muted-foreground">
                {t("totals.subtotal")}: <span className="text-foreground font-medium">{fmt(totals.subtotal)}</span>
            </span>
            {totals.discountAmount > 0 && (
                <span className="text-muted-foreground">
                    {t("totals.discount")}: <span className="text-foreground font-medium">-{fmt(totals.discountAmount)}</span>
                </span>
            )}
            {totals.taxAmount > 0 && (
                <span className="text-muted-foreground">
                    {t("totals.tax")}: <span className="text-foreground font-medium">{fmt(totals.taxAmount)}</span>
                </span>
            )}
            <span className="font-semibold text-base">{t("totals.total")}: {fmt(totals.total)}</span>
        </div>
    )
}

// ── Modal ──────────────────────────────────────────────────────────────────────

export function InvoiceFormModal({
    open,
    onClose,
    invoiceId,
    direction,
    initialTypeCode,
    onSuccess,
}: InvoiceFormModalProps) {
    const locale = useLocale()
    const t = useTranslations("business.resources.invoices")
    const tf = useTranslations("system.resourceForm")
    const ctrl = useInvoiceForm({ invoiceId, direction, open, onSuccess, onClose ,initialTypeCode})

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent
                showCloseButton={false}
                aria-describedby={undefined}
                className="flex flex-col min-w-7xl h-[90vh] p-0 overflow-hidden">
                <DialogDescription className="sr-only">
                    {ctrl.isEditing ? (ctrl.invoiceNumber ?? t("entity")) : t("newInvoice")}
                </DialogDescription>

                {/* Zone 1 — Sticky header */}
                <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
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
                                    getInvoicePrintPath(locale, direction, ctrl.invoiceId!),
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
                        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
                            <XIcon className="h-4 w-4" /><span className="sr-only">Close</span>
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
                            <Button type="button" variant="ghost" size="sm"
                                onClick={() => ctrl.form.reset(DEFAULT_INVOICE_FORM_VALUES)}
                                disabled={ctrl.isPending}
                            >
                                {tf("discard")}
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <ModalTotals totals={ctrl.totals} t={t} />
                        {!ctrl.isReadOnly && ctrl.isEditing && (
                            <Button type="button" onClick={() => ctrl.onSubmit()} disabled={ctrl.isBusy}>
                                {ctrl.isBusy ? tf("updating") : tf("update", { entity: t("entity") })}
                            </Button>
                        )}
                        {!ctrl.isReadOnly && !ctrl.isEditing && (
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" onClick={() => ctrl.onSubmit("draft")} disabled={ctrl.isBusy}>
                                    {ctrl.isBusy ? tf("creating") : t("actions.saveDraft")}
                                </Button>
                                <Button type="button" onClick={() => ctrl.onSubmit("complete")} disabled={ctrl.isBusy}>
                                    {ctrl.isBusy ? tf("creating") : t("actions.saveComplete")}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
