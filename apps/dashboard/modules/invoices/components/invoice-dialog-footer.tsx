"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { useInvoiceDialog } from "./invoice-dialog-context"
import { DEFAULT_INVOICE_FORM_VALUES, type InvoiceTotals } from "../invoices.config"

function ModalTotals({ totals, t }: { totals: InvoiceTotals; t: (k: string) => string }) {
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

export function InvoiceDialogFooter() {
    const t = useTranslations("business.resources.invoices")
    const tf = useTranslations("system.resourceForm")
    const { ctrl } = useInvoiceDialog()

    return (
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
    )
}
