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
import { useExpenseForm } from "../hooks/use-expense-form"
import { DEFAULT_EXPENSE_FORM_VALUES } from "../expenses.config"
import { ExpenseStatusBadge } from "./expense-status-badge"
import { ExpenseForm } from "./expense-form"
import { useExpenseActions } from "../hooks/use-expense-actions"
import { useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"

type ExpenseFormModalProps = {
    open: boolean
    onClose: () => void
    expenseId: string | null
    onSuccess?: () => void
}

export function ExpenseFormModal({
    open,
    onClose,
    expenseId,
    onSuccess,
}: ExpenseFormModalProps) {
    const t = useTranslations("business.resources.expenses")
    const tf = useTranslations("system.resourceForm")
    const api = useApi()
    const queryClient = useQueryClient()

    const ctrl = useExpenseForm({ expenseId, open, onSuccess, onClose })

    const { postExpense, cancelExpense } = useExpenseActions(() => {
        queryClient.invalidateQueries({ queryKey: [api.expenses.key, "show", expenseId] })
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
                    {ctrl.isEditing ? (ctrl.expenseNumber ?? t("entity")) : t("newExpense")}
                </DialogDescription>

                {/* Zone 1 — Sticky header */}
                <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="ltr:font-mono font-semibold text-base">
                            {ctrl.isEditing && ctrl.expenseNumber ? ctrl.expenseNumber : t("newExpense")}
                        </DialogTitle>
                        <ExpenseStatusBadge status={ctrl.status} />
                    </div>
                    <div className="flex items-center gap-2">
                        {ctrl.status === "DRAFT" && ctrl.isEditing && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => { if (expenseId) postExpense(expenseId) }}
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
                                onClick={() => { if (expenseId) cancelExpense(expenseId) }}
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

                {/* Zone 2 — Scrollable body */}
                <div className="flex-1 overflow-y-auto">
                    <ExpenseForm ctrl={ctrl} />
                </div>

                {/* Zone 3 — Sticky footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30 shrink-0">
                    <div>
                        {!ctrl.isEditing && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => ctrl.form.reset(DEFAULT_EXPENSE_FORM_VALUES)}
                                disabled={ctrl.isPending}
                            >
                                {tf("discard")}
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-sm tabular-nums">
                            <span className="text-muted-foreground">{t("total")}: </span>
                            <span className="font-semibold text-base">{fmt(ctrl.total)}</span>
                        </span>
                        {!ctrl.isReadOnly && (
                            <Button type="button" onClick={ctrl.onSubmit} disabled={ctrl.isBusy}>
                                {ctrl.isBusy
                                    ? (ctrl.isEditing ? tf("updating") : tf("creating"))
                                    : (ctrl.isEditing
                                        ? tf("update", { entity: t("entity") })
                                        : tf("create", { entity: t("entity") }))}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
