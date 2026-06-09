"use client"

import { useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"
import type { InvoiceTypesClient, PartiesClient, WarehousesClient, FiscalPeriodsClient, CurrenciesClient } from "@devloggers/api-client"
import { Button } from "@/shared/components/ui/button"
import { Rhform } from "@/shared/components/form"
import { RhfTextField, RhfTextareaField, RhfResourceSelect } from "@/shared/components/form"
import { DEFAULT_INVOICE_LINE } from "../invoices.config"
import type { InvoiceFormValues } from "../invoices.config"
import type { InvoiceFormController } from "../hooks/use-invoice-form"
import { InvoiceLineRow } from "./invoice-line-row"

// ── Types ──────────────────────────────────────────────────────────────────────

type InvoiceFormProps = {
    ctrl: InvoiceFormController
}

// ── Header fields ──────────────────────────────────────────────────────────────

function InvoiceHeaderFields({ disabled }: { disabled: boolean }) {
    const t = useTranslations("business.resources.invoices")

    return (
        <div className="space-y-4">
            <RhfResourceSelect<InvoiceFormValues, "invoiceTypeId", InvoiceTypesClient, string>
                name="invoiceTypeId"
                label={t("invoiceType")}
                client={(api) => api["invoice-types"]}
                
                getLabel={(it) => `${it.name} (${it.code})`}
                getValue={(it) => it.id}
                required
                disabled={disabled}
            />
            <div className="grid grid-cols-2 gap-3">
                <RhfTextField
                    name="date"
                    label={t("date")}
                    type="date"
                    required
                    disabled={disabled}
                />
                <RhfTextField
                    name="dueDate"
                    label={t("dueDate")}
                    type="date"
                    disabled={disabled}
                />
            </div>
            <RhfResourceSelect<InvoiceFormValues, "partyId", PartiesClient, string>
                name="partyId"
                label={t("party")}
                client={(api) => api.parties}
                getLabel={(it) => (it as { name: string }).name}
                getValue={(it) => it.id}
                required
                disabled={disabled}
            />
            <RhfResourceSelect<InvoiceFormValues, "warehouseId", WarehousesClient, string>
                name="warehouseId"
                label={t("warehouse")}
                client={(api) => api.warehouses}
                getLabel={(it) => (it as { name: string }).name}
                getValue={(it) => it.id}
                disabled={disabled}
            />
            <div className="grid grid-cols-2 gap-3">
                <RhfResourceSelect<InvoiceFormValues, "fiscalPeriodId", FiscalPeriodsClient, string>
                    name="fiscalPeriodId"
                    label={t("fiscalPeriod")}
                    client={(api) => api["fiscal-periods"]}
                    getLabel={(it) => (it as { name?: string; code?: string }).name ?? (it as { code?: string }).code ?? ""}
                    getValue={(it) => it.id}
                    required
                    disabled={disabled}
                />
                <RhfResourceSelect<InvoiceFormValues, "currencyId", CurrenciesClient, string>
                    name="currencyId"
                    label={t("currency")}
                    client={(api) => api.currencies}
                    getLabel={(it) => `${(it as { code?: string }).code ?? ""} — ${(it as { name?: string }).name ?? ""}`}
                    getValue={(it) => it.id}
                    required
                    disabled={disabled}
                />
            </div>
            <RhfTextareaField
                name="notes"
                label={t("notes")}
                disabled={disabled}
            />
        </div>
    )
}

// ── Line items table ───────────────────────────────────────────────────────────

function InvoiceLineItems({ ctrl }: { ctrl: InvoiceFormController }) {
    const t = useTranslations("business.resources.invoices")
    const { fields, append, remove, form, direction, isReadOnly, isBusy, isPending } = ctrl
    const disabled = isReadOnly || isBusy || isPending

    return (
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
                                control={form.control}
                                setValue={form.setValue}
                                getValues={form.getValues}
                                direction={direction}
                                onRemove={() => remove(index)}
                                disabled={disabled}
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
    )
}

// ── Main form ──────────────────────────────────────────────────────────────────

export function InvoiceForm({ ctrl }: InvoiceFormProps) {
    const disabled = ctrl.isReadOnly || ctrl.isBusy

    return (
        <Rhform form={ctrl.form} onSubmit={ctrl.onSubmit}>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <InvoiceHeaderFields disabled={disabled} />
                <InvoiceLineItems ctrl={ctrl} />
            </div>
        </Rhform>
    )
}
