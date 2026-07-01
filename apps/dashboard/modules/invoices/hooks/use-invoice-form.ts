"use client"

import { useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form"
import type { FieldArrayWithId } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useFormDefaultsQuery } from "@/modules/settings/hooks/use-form-defaults-query"
import type { InvoiceStatus } from "@devloggers/api-contracts"
import {
    DEFAULT_INVOICE_FORM_VALUES,
    DEFAULT_INVOICE_LINE,
    mapInvoiceToFormValues,
    invoiceFormSchema,
    toCreateInvoiceDto,
    toUpdateInvoiceDto,
    computeInvoiceTotals,
    type InvoiceDirection,
    type InvoiceFormValues,
    type InvoiceLineFormValues,
    type InvoiceTotals,
} from "../invoices.config"
import { useInvoiceActions } from "./use-invoice-actions"
import { CrudListDataItem, InvoiceTypesClient } from "@devloggers/api-client"
import { useCrudList } from "@devloggers/api-client/react"

// ── Types ──────────────────────────────────────────────────────────────────────

export type UseInvoiceFormOptions = {
    invoiceId: string | null
    direction: InvoiceDirection
    initialTypeCode:string
    open: boolean
    onSuccess?: () => void
    onClose: () => void
}

export type InvoiceFormController = {
    form: UseFormReturn<InvoiceFormValues>
    fields: FieldArrayWithId<InvoiceFormValues, "lines">[]
    append: (line: InvoiceLineFormValues) => void
    remove: (index: number) => void
    isEditing: boolean
    isReadOnly: boolean
    isBusy: boolean
    isPending: boolean
    status: InvoiceStatus | undefined
    invoiceNumber: string | undefined
    totals: InvoiceTotals
    onSubmit: () => void
    postInvoice: () => void
    cancelInvoice: () => void
    direction: InvoiceDirection
    initialTypeCode:string | null
 }

// Cache entry shape — InvoicesClient.show() returns any internally, so we
// define what we expect to find and pass it as a type parameter to getQueryData.
interface CachedInvoiceEntry {
    data?: { status?: InvoiceStatus; number?: string }
    status?: InvoiceStatus
    number?: string
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useInvoiceForm({
    invoiceId,
    direction,
    initialTypeCode,
    open,
    onSuccess,
    onClose,
}: UseInvoiceFormOptions): InvoiceFormController {
    const api = useApi()
    const tf = useTranslations("system.resourceForm")
    const t = useTranslations("business.resources.invoices")
    const queryClient = useQueryClient()
    const { data: invoiceTypesData } = useCrudList(api["invoice-types"])
    const { data: formDefaults } = useFormDefaultsQuery()

    // ── Form init ──────────────────────────────────────────────────────────────

    const { form, isEditing, isInitializing } = useResourceForm<InvoiceFormValues, unknown>({
        schema: invoiceFormSchema,
        defaultValues: DEFAULT_INVOICE_FORM_VALUES,
        resourceId: invoiceId,
        initialize: (id) => api.invoices.show(id),
        mapToFormValues: mapInvoiceToFormValues,
        queryKey: [api.invoices.key, "show", invoiceId],
    })

    // ── Field array ────────────────────────────────────────────────────────────

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    })

    // ── Status from cache ──────────────────────────────────────────────────────

    const cached = isEditing
        ? queryClient.getQueryData<CachedInvoiceEntry>([api.invoices.key, "show", invoiceId])
        : undefined

    const status: InvoiceStatus | undefined = cached?.data?.status ?? cached?.status
    const invoiceNumber: string | undefined = cached?.data?.number ?? cached?.number
    const isReadOnly = status === "POSTED" || status === "CANCELLED"

    // ── Live totals ────────────────────────────────────────────────────────────

    const watchedLines = useWatch({
        control: form.control,
        name: "lines",
    }) as InvoiceLineFormValues[]

    const totals = useMemo(
        () => computeInvoiceTotals(watchedLines ?? []),
        [watchedLines],
    )

    // Sync opening payment amount with invoice total when checkbox is on and amount hasn't been manually changed
    const watchedOpeningPayment = useWatch({ control: form.control, name: "openingPayment" })
    useEffect(() => {
        if (!watchedOpeningPayment || isEditing) return
        const current = form.getValues("openingPaymentAmount")
        // Only auto-fill if the field is empty or equals the previous total (i.e. still tracking)
        if (!current || current === 0) {
            form.setValue("openingPaymentAmount", totals.total, { shouldDirty: false })
        }
    }, [totals.total, watchedOpeningPayment, isEditing]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Submit mutation ────────────────────────────────────────────────────────

    const { mutate, isPending } = useFormMutation(form, {
        mutationFn: async (values: InvoiceFormValues) => {
            const promise = isEditing && invoiceId
                ? api.invoices.update(invoiceId, toUpdateInvoiceDto(values))
                : api.invoices.create(toCreateInvoiceDto(values))

            toast.promise(promise, {
                loading: isEditing ? tf("updating") : tf("creating"),
                success: isEditing
                    ? tf("updated", { entity: t("entity") })
                    : tf("created", { entity: t("entity") }),
                error: isEditing
                    ? tf("updateFailed", { entity: t("entity") })
                    : tf("createFailed", { entity: t("entity") }),
            })

            const result = await promise

            // After a new invoice is created, optionally create an opening payment
            if (!isEditing && values.openingPayment && values.openingPaymentCashbox?.id) {
                const paymentType = direction === "SALE" ? "RECEIPT" : "PAYMENT"
                const paymentPromise = api.payments.create({
                    type: paymentType,
                    date: values.date,
                    cashboxId: values.openingPaymentCashbox.id,
                    partyId: values.party?.id || undefined,
                    currencyId: values.currency?.id ?? "",
                    fiscalPeriodId: values.fiscalPeriod?.id ?? "",
                    amount: values.openingPaymentAmount ?? totals.total,
                    exchangeRate: values.exchangeRate !== 1 ? values.exchangeRate : undefined,
                })
                toast.promise(paymentPromise, {
                    loading: t("openingPayment.creating"),
                    success: t("openingPayment.created"),
                    error: t("openingPayment.failed"),
                })
                await paymentPromise
            }

            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.invoices.key] })
            queryClient.invalidateQueries({ queryKey: [api.payments.key] })
            form.reset(DEFAULT_INVOICE_FORM_VALUES)
            onSuccess?.()
            onClose()
        },
    })

    // ── Status actions ─────────────────────────────────────────────────────────

    const { postInvoice: postById, cancelInvoice: cancelById } = useInvoiceActions(() => {
        queryClient.invalidateQueries({ queryKey: [api.invoices.key, "show", invoiceId] })
        onSuccess?.()
        onClose()
    })

    // ── Reset on close ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (!open) {
            form.reset(DEFAULT_INVOICE_FORM_VALUES)
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-select invoice type by page direction (create mode only) ────────────
    // Editing loads the saved type via the mapper, so only default it when creating.

    useEffect(() => {
        if (!open || isEditing) return
        if (form.getValues("invoiceType")?.id) return
        const match = (invoiceTypesData?.data ?? []).find(
            (it: CrudListDataItem<InvoiceTypesClient>) => it.code === initialTypeCode,
        )
        if (match) form.setValue("invoiceType", match)
    }, [invoiceTypesData, open, isEditing, direction, form, initialTypeCode])

    useEffect(() => {
        if (!open || isEditing || !formDefaults) return
        const { fiscalPeriod, currency, cashbox } = formDefaults
        if (fiscalPeriod && !form.getValues("fiscalPeriod")?.id) {
            form.setValue("fiscalPeriod", fiscalPeriod, { shouldDirty: false })
        }
        if (currency && !form.getValues("currency")?.id) {
            form.setValue("currency", currency, { shouldDirty: false })
        }
        if (cashbox && !form.getValues("openingPaymentCashbox")?.id) {
            form.setValue("openingPaymentCashbox", cashbox, { shouldDirty: false })
        }
    }, [open, isEditing, formDefaults]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Return controller ──────────────────────────────────────────────────────

    return {
        initialTypeCode,
        form,
        fields,
        append: (line) => append({ ...DEFAULT_INVOICE_LINE, ...line }),
        remove,
        isEditing,
        isReadOnly,
        isBusy: isInitializing || isPending,
        isPending,
        status,
        invoiceNumber,
        totals,
        onSubmit: () => form.handleSubmit((values) => mutate(values))(),
        postInvoice: () => { if (invoiceId) postById(invoiceId) },
        cancelInvoice: () => { if (invoiceId) cancelById(invoiceId) },
        direction,
    }
}
