"use client"

import { useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"
import type {
    CashboxesClient,
    CurrenciesClient,
    FiscalPeriodsClient,
} from "@devloggers/api-client"
import { Button } from "@/shared/components/ui/button"
import { Rhform, RhfTextareaField, RhfResourceSelect, RhfTextField } from "@/shared/components/form"
import { RhfDateField } from "@/shared/components/form/fields/rhf-date-field"
import { DEFAULT_EXPENSE_ITEM, type ExpenseFormValues, type ExpenseRelationalField } from "../expenses.config"
import type { ExpenseFormController } from "../hooks/use-expense-form"
import { ExpenseLineRow } from "./expense-line-row"

// ── Header fields ──────────────────────────────────────────────────────────────

function ExpenseHeaderFields({ ctrl }: { ctrl: ExpenseFormController }) {
    const t = useTranslations("business.resources.expenses")
    const disabled = ctrl.isReadOnly || ctrl.isBusy

    return (
        <div className="space-y-4">
            <RhfDateField
                name="date"
                label={t("date")}
                required
                disabled={disabled}
            />
            <RhfResourceSelect<ExpenseFormValues, "cashbox", CashboxesClient, ExpenseRelationalField>
                name="cashbox"
                label={t("cashbox")}
                client={(api) => api.cashboxes}
                getLabel={(it) => `${(it as any).code} — ${(it as any).name}`}
                getValue={(it) => it}
                required
                disabled={disabled}
            />
            <div className="grid grid-cols-2 gap-3">
                <RhfResourceSelect<ExpenseFormValues, "currency", CurrenciesClient, ExpenseRelationalField>
                    name="currency"
                    label={t("currency")}
                    client={(api) => api.currencies}
                    getLabel={(it) => `${(it as any).code} — ${(it as any).name}`}
                    getValue={(it) => it}
                    required
                    disabled={disabled}
                />
                <RhfResourceSelect<ExpenseFormValues, "fiscalPeriod", FiscalPeriodsClient, ExpenseRelationalField>
                    name="fiscalPeriod"
                    label={t("fiscalPeriod")}
                    client={(api) => api["fiscal-periods"]}
                    getLabel={(it) => (it as any).name}
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

function ExpenseLineItems({ ctrl }: { ctrl: ExpenseFormController }) {
    const t = useTranslations("business.resources.expenses")
    const { fields, append, remove, form, isReadOnly, isBusy, isPending } = ctrl
    const disabled = isReadOnly || isBusy || isPending

    return (
        <div className="flex flex-col gap-3">
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.account")}</th>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.description")}</th>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.amount")}</th>
                            <th className="px-2 py-2 text-start text-xs font-medium text-muted-foreground">{t("lines.notes")}</th>
                            <th className="w-8" />
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, index) => (
                            <ExpenseLineRow
                                key={field.id}
                                index={index}
                                control={form.control}
                                setValue={form.setValue}
                                onRemove={() => remove(index)}
                                disabled={disabled}
                            />
                        ))}
                        {fields.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                                    No items. Click &quot;Add item&quot; to start.
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
                    onClick={() => append({ ...DEFAULT_EXPENSE_ITEM })}
                >
                    <PlusIcon className="me-1.5 h-3.5 w-3.5" />
                    {t("lines.addItem")}
                </Button>
            )}
        </div>
    )
}

// ── Main form ──────────────────────────────────────────────────────────────────

export function ExpenseForm({ ctrl }: { ctrl: ExpenseFormController }) {
    return (
        <Rhform form={ctrl.form} onSubmit={ctrl.onSubmit}>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ExpenseHeaderFields ctrl={ctrl} />
                <ExpenseLineItems ctrl={ctrl} />
            </div>
        </Rhform>
    )
}
