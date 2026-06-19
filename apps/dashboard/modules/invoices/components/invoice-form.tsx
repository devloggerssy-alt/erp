"use client"

import { useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"
import type {
    InvoiceTypesClient,
    WarehousesClient,
    FiscalPeriodsClient,
    CurrenciesClient,
} from "@devloggers/api-client"
import { Button } from "@/shared/components/ui/button"
import { Rhform } from "@/shared/components/form"
import { RhfTextareaField, RhfResourceSelect, RhfTextField } from "@/shared/components/form"
import { DEFAULT_INVOICE_LINE } from "../invoices.config"
import type { InvoiceFormValues, InvoiceRelationalField, InvoiceDirection } from "../invoices.config"
import type { InvoiceFormController } from "../hooks/use-invoice-form"
import { InvoiceLineRow } from "./invoice-line-row"
import { RhfDateField } from "@/shared/components/form/fields/rhf-date-field"
import { InvoicePartySelect, type PartyTypeFilter } from "./invoice-party-select"

const PARTY_TYPES_BY_DIRECTION: Record<InvoiceDirection, PartyTypeFilter[]> = {
    SALE: ["CUSTOMER", "CUSTOMER_SUPPLIER"],
    PURCHASE: ["SUPPLIER", "CUSTOMER_SUPPLIER"],
}

// ── Header fields ──────────────────────────────────────────────────────────────

function InvoiceHeaderFields({ disabled, direction }: { disabled: boolean; direction: InvoiceDirection }) {
    const t = useTranslations("business.resources.invoices")
    const gt = useTranslations()
    const partyTitle = direction === "SALE" ? gt("business.resources.customers.entity") : gt("business.resources.suppliers.entity")

    return (
        <div className="space-y-4">
            <RhfResourceSelect<InvoiceFormValues, "invoiceType", InvoiceTypesClient, InvoiceRelationalField>
                name="invoiceType"
                label={t("invoiceType")}
                client={(api) => api["invoice-types"]}
                getLabel={(it) => `${it.name} (${it.code})`}
                getValue={(it) => it}
                required
                disabled={disabled}
            />
            <div className="grid grid-cols-1 gap-3">
                <RhfDateField
                    name="date"
                    label={t("date")}
                    required
                    disabled={disabled}
                />
                <RhfDateField
                    name="dueDate"
                    label={t("dueDate")}
                    disabled={disabled}
                />
            </div>
            <InvoicePartySelect label={partyTitle} partyTypes={PARTY_TYPES_BY_DIRECTION[direction]} disabled={disabled} />

            <RhfResourceSelect<InvoiceFormValues, "warehouse", WarehousesClient, InvoiceRelationalField>
                name="warehouse"
                label={t("warehouse")}
                client={(api) => api.warehouses}
                getLabel={(it) => it.name}
                getValue={(it) => it}
                disabled={disabled}
            />
            <div className="grid grid-cols-1 gap-3">
                <RhfResourceSelect<InvoiceFormValues, "fiscalPeriod", FiscalPeriodsClient, InvoiceRelationalField>
                    name="fiscalPeriod"
                    label={t("fiscalPeriod")}
                    client={(api) => api["fiscal-periods"]}
                    getLabel={(it) => it.name}
                    getValue={(it) => it}
                    required
                    disabled={disabled}
                />
                <RhfResourceSelect<InvoiceFormValues, "currency", CurrenciesClient, InvoiceRelationalField>
                    name="currency"
                    label={t("currency")}
                    client={(api) => api.currencies}
                    getLabel={(it) => `${it.code} — ${it.name}`}
                    getValue={(it) => it}
                    required
                    disabled={disabled}
                />
            </div>
            <RhfTextField
                name="exchangeRate"
                label={t("exchangeRate")}
                type="number"
                disabled={disabled}
            />
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

export function InvoiceForm({ ctrl }: { ctrl: InvoiceFormController }) {
    const disabled = ctrl.isReadOnly || ctrl.isBusy

    return (
        <Rhform form={ctrl.form} onSubmit={ctrl.onSubmit} errorHandler={ers => {
            console.log("Form submission errors:", ers)
        }}>
            <div className="p-6 grid grid-cols-12 gap-8">
                <div className="col-span-3">

                    <InvoiceHeaderFields disabled={disabled} direction={ctrl.direction} />
                </div>

                <div className="col-span-9">

                    <InvoiceLineItems ctrl={ctrl} />
                </div>
            </div>
        </Rhform>
    )
}
