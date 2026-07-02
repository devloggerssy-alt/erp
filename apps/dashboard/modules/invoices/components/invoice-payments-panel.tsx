"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon } from "lucide-react"
import type { CashboxesClient } from "@devloggers/api-client"
import { useApi } from "@/shared/useApi"
import { confirm } from "@/shared/components/confirm-dialog"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { Button } from "@/shared/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Rhform, RhfResourceSelect, RhfTextField } from "@/shared/components/form"
import { RhfDateField } from "@/shared/components/form/fields/rhf-date-field"
import type { InvoiceFormController, InvoicePaymentItem } from "../hooks/use-invoice-form"

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Add payment dialog ────────────────────────────────────────────────────────

const addPaymentSchema = z.object({
    cashbox: z.object({ id: z.string() }).passthrough().nullable(),
    amount: z.coerce.number().min(0.01, "Amount must be > 0"),
    date: z.string().min(1, "Date is required"),
}).superRefine((data, ctx) => {
    if (!data.cashbox?.id) {
        ctx.addIssue({ code: "custom", path: ["cashbox"], message: "Cashbox is required" })
    }
})

type AddPaymentFormValues = z.infer<typeof addPaymentSchema>

function defaultAddPaymentValues(amount: number): AddPaymentFormValues {
    return { cashbox: null, amount, date: new Date().toISOString().split("T")[0]! }
}

function AddPaymentDialog({ ctrl }: { ctrl: InvoiceFormController }) {
    const t = useTranslations("business.resources.invoices")
    const tf = useTranslations("system.resourceForm")
    const api = useApi()
    const queryClient = useQueryClient()
    const [open, setOpen] = useState(false)
    const currencyId = ctrl.form.getValues("currency")?.id
    const invoiceId = ctrl.invoiceId

    const form = useForm<AddPaymentFormValues>({
        resolver: zodResolver(addPaymentSchema as z.ZodType<AddPaymentFormValues, any, any>),
        defaultValues: defaultAddPaymentValues(ctrl.balanceDue ?? 0),
    })

    const { mutate, isPending } = useFormMutation(form, {
        mutationFn: (values: AddPaymentFormValues) => {
            const promise = api.invoices.addPayment(invoiceId!, {
                cashboxId: values.cashbox!.id,
                amount: values.amount,
                date: values.date,
            })
            toast.promise(promise, {
                loading: t("payments.adding"),
                success: t("payments.added"),
                error: (err: Error) => err.message,
            })
            return promise
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.invoices.key, "show", invoiceId] })
            queryClient.invalidateQueries({ queryKey: [api.invoices.key] })
            queryClient.invalidateQueries({ queryKey: [api.payments.key] })
            setOpen(false)
        },
    })

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v)
                if (v) form.reset(defaultAddPaymentValues(ctrl.balanceDue ?? 0))
            }}
        >
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                    <PlusIcon className="me-1.5 h-3.5 w-3.5" />
                    {t("payments.add")}
                </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-w-md">
                <DialogTitle>{t("payments.add")}</DialogTitle>
                <DialogDescription className="sr-only">{t("payments.add")}</DialogDescription>
                <Rhform form={form} onSubmit={(values) => mutate(values)}>
                    <div className="space-y-4">
                        <RhfResourceSelect<AddPaymentFormValues, "cashbox", CashboxesClient, { id: string }>
                            name="cashbox"
                            label={t("openingPayment.cashbox")}
                            client={(api) => api.cashboxes}
                            getLabel={(it) => `${(it as Record<string, string>)["code"]} — ${(it as Record<string, string>)["name"]}`}
                            getValue={(it) => it}
                            extraQuery={currencyId ? { filters: { currencyId: { $eq: currencyId } } } : undefined}
                            required
                        />
                        <RhfDateField name="date" label={t("date")} required />
                        <RhfTextField name="amount" label={t("openingPayment.amount")} type="number" required />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                            {tf("discard")}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? tf("creating") : t("payments.add")}
                        </Button>
                    </div>
                </Rhform>
            </DialogContent>
        </Dialog>
    )
}

// ── Payment row ────────────────────────────────────────────────────────────────

function PaymentRow({ payment, invoiceId }: { payment: InvoicePaymentItem; invoiceId: string }) {
    const t = useTranslations("business.resources.invoices")
    const api = useApi()
    const queryClient = useQueryClient()

    const handleRemove = async () => {
        const confirmed = await confirm({
            title: t("payments.removeTitle"),
            description: t("payments.removeConfirm"),
            confirmLabel: t("payments.remove"),
            variant: "destructive",
        })
        if (!confirmed) return

        const promise = api.payments.removeAllocation(payment.paymentId, payment.id)
        toast.promise(promise, {
            loading: t("payments.removing"),
            success: t("payments.removed"),
            error: (err: Error) => err.message,
        })
        await promise
        queryClient.invalidateQueries({ queryKey: [api.invoices.key, "show", invoiceId] })
        queryClient.invalidateQueries({ queryKey: [api.invoices.key] })
        queryClient.invalidateQueries({ queryKey: [api.payments.key] })
    }

    return (
        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center gap-3">
                <span className="font-mono font-medium">{payment.paymentNumber}</span>
                <span className="text-muted-foreground">
                    {payment.date ? new Date(payment.date).toLocaleDateString() : "—"}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <span className="font-medium tabular-nums">{fmt(payment.amount)}</span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={handleRemove}>
                    <Trash2Icon className="h-3.5 w-3.5" />
                    <span className="sr-only">{t("payments.remove")}</span>
                </Button>
            </div>
        </div>
    )
}

// ── Panel ──────────────────────────────────────────────────────────────────────

export function InvoicePaymentsPanel({ ctrl }: { ctrl: InvoiceFormController }) {
    const t = useTranslations("business.resources.invoices")

    if (!ctrl.isEditing || ctrl.status === "DRAFT" || !ctrl.invoiceId) return null

    const payments = ctrl.payments ?? []

    return (
        <div className="space-y-3 rounded-lg border p-4 pt-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t("payments.title")}</p>
                {ctrl.status === "POSTED" && <AddPaymentDialog ctrl={ctrl} />}
            </div>
            {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("payments.empty")}</p>
            ) : (
                <div className="space-y-2">
                    {payments.map((payment) => (
                        <PaymentRow key={payment.id} payment={payment} invoiceId={ctrl.invoiceId!} />
                    ))}
                </div>
            )}
            <p className="text-sm font-medium">
                {t("payments.paidOf", { paid: fmt(ctrl.amountPaid ?? 0), total: fmt(ctrl.totals.total) })}
            </p>
        </div>
    )
}
