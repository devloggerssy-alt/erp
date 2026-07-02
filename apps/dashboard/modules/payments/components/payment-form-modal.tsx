"use client"

import { useTranslations } from "next-intl"
import { SendIcon, XCircleIcon, XIcon } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { usePaymentForm } from "../hooks/use-payment-form"
import { DEFAULT_PAYMENT_FORM_VALUES } from "../payments.config"
import { PaymentStatusBadge } from "./payment-status-badge"
import { PaymentForm } from "./payment-form"
import { usePaymentActions } from "../hooks/use-payment-actions"
import { useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

type PaymentFormModalProps = {
    open: boolean
    onClose: () => void
    paymentId: string | null
    onSuccess?: () => void
}

export function PaymentFormModal({
    open,
    onClose,
    paymentId,
    onSuccess,
}: PaymentFormModalProps) {
    const t = useTranslations("business.resources.payments")
    const tf = useTranslations("system.resourceForm")
    const api = useApi()
    const queryClient = useQueryClient()

    const ctrl = usePaymentForm({ paymentId, open, onSuccess, onClose })

    const { postPayment, cancelPayment } = usePaymentActions(() => {
        queryClient.invalidateQueries({ queryKey: [api.payments.key, "show", paymentId] })
        onSuccess?.()
        onClose()
    })

    const fmt = (n: number) =>
        n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent
                showCloseButton={false}
                aria-describedby={undefined}
                className="inset-0 translate-x-0 rtl:translate-x-0 translate-y-0 max-w-none sm:max-w-none h-screen max-h-screen rounded-none flex flex-col p-0 gap-0"
            >
                <DialogDescription className="sr-only">
                    {ctrl.isEditing ? (ctrl.paymentNumber ?? t("entity")) : t("newPayment")}
                </DialogDescription>

                {/* Sticky header */}
                <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="ltr:font-mono font-semibold text-base">
                            {ctrl.isEditing && ctrl.paymentNumber ? ctrl.paymentNumber : t("newPayment")}
                        </DialogTitle>
                        <PaymentStatusBadge status={ctrl.status} />
                    </div>
                    <div className="flex items-center gap-2">
                        {ctrl.status === "DRAFT" && ctrl.isEditing && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => { if (paymentId) postPayment(paymentId) }}
                                disabled={ctrl.isPending}
                            >
                                <SendIcon className="me-1.5 h-3.5 w-3.5" />
                                {t("actions.post")}
                            </Button>
                        )}
                        {ctrl.status === "POSTED" && ctrl.isEditing && (
                            <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => { if (paymentId) cancelPayment(paymentId) }}
                                disabled={ctrl.isPending}
                            >
                                <XCircleIcon className="me-1.5 h-3.5 w-3.5" />
                                {t("actions.cancel")}
                            </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
                            <XIcon className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto max-w-lg">
                    <PaymentForm ctrl={ctrl} />
                </div>

                {/* Sticky footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30 shrink-0">
                    <div>
                        {!ctrl.isEditing && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => ctrl.form.reset(DEFAULT_PAYMENT_FORM_VALUES)}
                                disabled={ctrl.isPending}
                            >
                                {tf("discard")}
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-sm tabular-nums">
                            <span className="text-muted-foreground">{t("amount")}: </span>
                            <span className="font-semibold text-base">
                                {fmt(ctrl.form.watch("amount") || 0)}
                            </span>
                        </span>
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
