"use client"

import { useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon, XIcon, SendIcon, XCircleIcon } from "lucide-react"
import { useApi } from "@/shared/useApi"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Rhform } from "@/shared/components/form"
import { RhfTextField, RhfTextareaField, RhfResourceSelect } from "@/shared/components/form"
import { cn } from "@/shared/lib/utils"
import {
    invoiceFormSchema,
    mapInvoiceToFormValues,
    DEFAULT_INVOICE_FORM_VALUES,
    DEFAULT_INVOICE_LINE,
    toCreateInvoiceDto,
    toUpdateInvoiceDto,
    computeLineTotals,
    computeInvoiceTotals,
    type InvoiceFormValues,
    type InvoiceLineFormValues,
    type InvoiceDirection,
} from "../invoices.config"
import { useInvoiceActions } from "../hooks/use-invoice-actions"

type InvoiceFormModalProps = {
    open: boolean
    onClose: () => void
    invoiceId: string | null
    direction: InvoiceDirection
    onSuccess?: () => void
}

// ── Status badge ──────────────────────────────────────────────────────────────

function ModalStatusBadge({ status, t }: { status: string | undefined; t: (k: string) => string }) {
    if (!status) return null
    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs font-medium",
                status === "POSTED" && "border-green-500 text-green-700 dark:text-green-400",
                status === "CANCELLED" && "border-destructive text-destructive",
                status === "DRAFT" && "border-muted-foreground text-muted-foreground",
            )}
        >
            {status === "POSTED"
                ? t("status.posted")
                : status === "CANCELLED"
                    ? t("status.cancelled")
                    : t("status.draft")}
        </Badge>
    )
}

// ── Line row ──────────────────────────────────────────────────────────────────

function InvoiceLineRow({
    index,
    form,
    direction,
    onRemove,
    disabled,
    t,
}: {
    index: number
    form: ReturnType<typeof useForm<InvoiceFormValues>>
    direction: InvoiceDirection
    onRemove: () => void
    disabled: boolean
    t: (k: string) => string
}) {
    // Watch _item to auto-fill unit + price on item selection
    const itemRef = useWatch({ control: form.control, name: `lines.${index}._item` })

    useEffect(() => {
        if (!itemRef?.id) return
        // Sync itemId from full object
        form.setValue(`lines.${index}.itemId`, itemRef.id)
        // Auto-fill unit if not already set
        const currentUnit = form.getValues(`lines.${index}.unitId`)
        if (!currentUnit && itemRef.baseUnitId) {
            form.setValue(`lines.${index}.unitId`, itemRef.baseUnitId)
        }
        // Auto-fill price if not already set
        const currentPrice = form.getValues(`lines.${index}.unitPrice`)
        if (!currentPrice || currentPrice === 0) {
            const price = direction === "PURCHASE"
                ? (itemRef.latestPurchasePrice ?? 0)
                : (itemRef.defaultSellingPrice ?? 0)
            form.setValue(`lines.${index}.unitPrice`, Number(price))
        }
    }, [itemRef?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    const watchedLine = useWatch({
        control: form.control,
        name: `lines.${index}`,
    }) as InvoiceLineFormValues

    const { lineTotal } = computeLineTotals(watchedLine)

    return (
        <tr className="border-b last:border-0 group">
            <td className="p-1 min-w-[180px]">
                <RhfResourceSelect<InvoiceFormValues, any, any, any>
                    name={`lines.${index}._item` as any}
                    client={(api: any) => api.items}
                    getLabel={(it: any) => `${it.code ?? ""} ${it.name ?? ""}`.trim()}
                    getValue={(it: any) => it}
                    getId={(it: any) => String(it.id)}
                    placeholder={t("lines.item")}
                    disabled={disabled}
                    pageSize={30}
                />
            </td>
            <td className="p-1 min-w-[120px]">
                <RhfResourceSelect<InvoiceFormValues, any>
                    name={`lines.${index}.unitId` as any}
                    client={(api) => api.units}
                    getLabel={(it: any) => it.name}
                    getValue={(it: any) => it.id}
                    placeholder={t("lines.unit")}
                    disabled={disabled}
                    pageSize={30}
                />
            </td>
            <td className="p-1 w-20">
                <RhfTextField
                    name={`lines.${index}.quantity` as any}
                    type="number"
                    placeholder="1"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-28">
                <RhfTextField
                    name={`lines.${index}.unitPrice` as any}
                    type="number"
                    placeholder="0"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-16">
                <RhfTextField
                    name={`lines.${index}.discountPercent` as any}
                    type="number"
                    placeholder="0"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-16">
                <RhfTextField
                    name={`lines.${index}.taxPercent` as any}
                    type="number"
                    placeholder="0"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-28 text-end tabular-nums text-sm font-medium">
                {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="p-1 w-8">
                {!disabled && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={onRemove}
                    >
                        <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                )}
            </td>
        </tr>
    )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function InvoiceFormModal({
    open,
    onClose,
    invoiceId,
    direction,
    onSuccess,
}: InvoiceFormModalProps) {
    const api = useApi()
    const t = useTranslations("business.resources.invoices")
    const tf = useTranslations("system.resourceForm")
    const queryClient = useQueryClient()

    const isEditing = !!invoiceId

    const { form, isInitializing } = useResourceForm<InvoiceFormValues, unknown>({
        schema: invoiceFormSchema,
        defaultValues: DEFAULT_INVOICE_FORM_VALUES,
        resourceId: invoiceId,
        initialize: (id) => api.invoices.show(id),
        mapToFormValues: mapInvoiceToFormValues,
        queryKey: [api.invoices.key, "show", invoiceId],
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    })

    // Read invoice status directly from the React Query cache
    const cachedInvoice = isEditing
        ? (queryClient.getQueryData([api.invoices.key, "show", invoiceId]) as any)
        : undefined
    const status: string | undefined = cachedInvoice
        ? (cachedInvoice?.data?.status ?? cachedInvoice?.status)
        : undefined

    const isReadOnly = status === "POSTED" || status === "CANCELLED"
    const isBusy = isInitializing

    // Live totals via useWatch
    const watchedLines = useWatch({ control: form.control, name: "lines" }) as InvoiceLineFormValues[]
    const totals = useMemo(() => computeInvoiceTotals(watchedLines ?? []), [watchedLines])

    // Submit mutation
    const { mutate, isPending } = useFormMutation(form, {
        mutationFn: (values: InvoiceFormValues) => {
            const promise = isEditing
                ? api.invoices.update(invoiceId!, toUpdateInvoiceDto(values))
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
            return promise
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.invoices.key] })
            form.reset(DEFAULT_INVOICE_FORM_VALUES)
            onSuccess?.()
            onClose()
        },
    })

    // Status action buttons (post / cancel)
    const { postInvoice, cancelInvoice } = useInvoiceActions(() => {
        queryClient.invalidateQueries({ queryKey: [api.invoices.key, "show", invoiceId] })
        onSuccess?.()
        onClose()
    })

    // Reset form on close
    useEffect(() => {
        if (!open) {
            form.reset(DEFAULT_INVOICE_FORM_VALUES)
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    const invoiceNumber = cachedInvoice?.data?.number ?? cachedInvoice?.number

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent
                showCloseButton={false}
                aria-describedby={undefined}
                className="inset-0 translate-x-0 rtl:translate-x-0 translate-y-0 max-w-none sm:max-w-none h-screen max-h-screen rounded-none flex flex-col p-0 gap-0"
            >
                <DialogDescription className="sr-only">
                    {isEditing ? (invoiceNumber ?? t("entity")) : t("newInvoice")}
                </DialogDescription>
                {/* Zone 1: Sticky header bar */}
                <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="font-mono font-semibold text-base">
                            {isEditing && invoiceNumber ? invoiceNumber : t("newInvoice")}
                        </DialogTitle>
                        <ModalStatusBadge status={status} t={t} />
                    </div>
                    <div className="flex items-center gap-2">
                        {status === "DRAFT" && invoiceId && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => postInvoice(invoiceId)}
                                disabled={isPending}
                            >
                                <SendIcon className="me-1.5 h-3.5 w-3.5" />
                                {t("actions.post")}
                            </Button>
                        )}
                        {status === "POSTED" && invoiceId && (
                            <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => cancelInvoice(invoiceId)}
                                disabled={isPending}
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

                {/* Zone 2: Scrollable body */}
                <div className="flex-1 overflow-y-auto">
                    <Rhform form={form} onSubmit={(v) => mutate(v)}>
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left column: Header fields */}
                            <div className="space-y-4">
                                <RhfResourceSelect<InvoiceFormValues, "invoiceTypeId", any, string>
                                    name="invoiceTypeId"
                                    label={t("invoiceType")}
                                    client={(api: any) => api["invoice-types"]}
                                    getLabel={(it: any) => `${it.code ?? ""} — ${it.name?.en ?? it.name?.ar ?? it.code ?? ""}`}
                                    getValue={(it: any) => it.id}
                                    required
                                    disabled={isReadOnly || isBusy}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <RhfTextField
                                        name="date"
                                        label={t("date")}
                                        type="date"
                                        required
                                        disabled={isReadOnly || isBusy}
                                    />
                                    <RhfTextField
                                        name="dueDate"
                                        label={t("dueDate")}
                                        type="date"
                                        disabled={isReadOnly || isBusy}
                                    />
                                </div>
                                <RhfResourceSelect<InvoiceFormValues, "partyId">
                                    name="partyId"
                                    label={t("party")}
                                    client={(api) => api.parties}
                                    getLabel={(it: any) => it.name}
                                    getValue={(it: any) => it.id}
                                    required
                                    disabled={isReadOnly || isBusy}
                                />
                                <RhfResourceSelect<InvoiceFormValues, "warehouseId">
                                    name="warehouseId"
                                    label={t("warehouse")}
                                    client={(api) => api.warehouses}
                                    getLabel={(it: any) => it.name}
                                    getValue={(it: any) => it.id}
                                    disabled={isReadOnly || isBusy}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <RhfResourceSelect<InvoiceFormValues, "fiscalPeriodId">
                                        name="fiscalPeriodId"
                                        label={t("fiscalPeriod")}
                                        client={(api) => (api as any)["fiscal-periods"]}
                                        getLabel={(it: any) => it.name ?? it.code}
                                        getValue={(it: any) => it.id}
                                        required
                                        disabled={isReadOnly || isBusy}
                                    />
                                    <RhfResourceSelect<InvoiceFormValues, "currencyId">
                                        name="currencyId"
                                        label={t("currency")}
                                        client={(api) => api.currencies}
                                        getLabel={(it: any) => `${it.code} — ${it.name}`}
                                        getValue={(it: any) => it.id}
                                        required
                                        disabled={isReadOnly || isBusy}
                                    />
                                </div>
                                <RhfTextareaField
                                    name="notes"
                                    label={t("notes")}
                                    disabled={isReadOnly || isBusy}
                                />
                            </div>

                            {/* Right column: Line items */}
                            <div className="flex flex-col gap-3">
                                <div className="overflow-x-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.item")}</th>
                                                <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.unit")}</th>
                                                <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.quantity")}</th>
                                                <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.unitPrice")}</th>
                                                <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.discountPercent")}</th>
                                                <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.taxPercent")}</th>
                                                <th className="px-2 py-2 text-end text-xs font-medium text-muted-foreground">{t("lines.total")}</th>
                                                <th className="w-8" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fields.map((field, index) => (
                                                <InvoiceLineRow
                                                    key={field.id}
                                                    index={index}
                                                    form={form}
                                                    direction={direction}
                                                    onRemove={() => remove(index)}
                                                    disabled={isReadOnly || isBusy || isPending}
                                                    t={t}
                                                />
                                            ))}
                                            {fields.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                                                        No lines. Click &quot;Add line&quot; to start.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {!isReadOnly && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-fit"
                                        onClick={() => append({ ...DEFAULT_INVOICE_LINE })}
                                    >
                                        <PlusIcon className="me-1.5 h-3.5 w-3.5" />
                                        {t("lines.addLine")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Rhform>
                </div>

                {/* Zone 3: Sticky footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30 shrink-0">
                    <div>
                        {!isEditing && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => form.reset(DEFAULT_INVOICE_FORM_VALUES)}
                                disabled={isPending}
                            >
                                Discard
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-sm tabular-nums">
                            <span className="text-muted-foreground">
                                {t("totals.subtotal")}:{" "}
                                <span className="text-foreground font-medium">
                                    {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </span>
                            {totals.discountAmount > 0 && (
                                <span className="text-muted-foreground">
                                    {t("totals.discount")}:{" "}
                                    <span className="text-foreground font-medium">
                                        -{totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </span>
                            )}
                            {totals.taxAmount > 0 && (
                                <span className="text-muted-foreground">
                                    {t("totals.tax")}:{" "}
                                    <span className="text-foreground font-medium">
                                        {totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </span>
                            )}
                            <span className="font-semibold text-base">
                                {t("totals.total")}: {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {!isReadOnly && (
                            <Button
                                type="button"
                                onClick={() => form.handleSubmit((values) => mutate(values))()}
                                disabled={isPending || isBusy}
                            >
                                {isPending
                                    ? (isEditing ? tf("updating") : tf("creating"))
                                    : (isEditing
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
