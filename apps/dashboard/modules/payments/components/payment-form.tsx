"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { useWatch } from "react-hook-form"
import type {
    CashboxesClient,
    CurrenciesClient,
    FiscalPeriodsClient,
    PartiesClient,
} from "@devloggers/api-client"
import { Rhform, RhfTextareaField, RhfResourceSelect, RhfTextField, RhfSelectField } from "@/shared/components/form"
import { RhfDateField } from "@/shared/components/form/fields/rhf-date-field"
import type { PaymentFormValues, PaymentRelationalField } from "../payments.config"
import type { PaymentFormController } from "../hooks/use-payment-form"

export function PaymentForm({ ctrl }: { ctrl: PaymentFormController }) {
    const t = useTranslations("business.resources.payments")
    const disabled = ctrl.isReadOnly || ctrl.isBusy
    const currencyId = useWatch({ control: ctrl.form.control, name: "currency", compute: (c) => c?.id })

    // Reset the cashbox when currency changes so a cashbox in the previous
    // currency can't linger selected. Skip the first undefined → value transition
    // so edit-mode prefill (currency + cashbox loaded together) isn't clobbered.
    const prevCurrencyIdRef = useRef<string | undefined>(undefined)
    useEffect(() => {
        if (prevCurrencyIdRef.current !== undefined && prevCurrencyIdRef.current !== currencyId) {
            ctrl.form.setValue("cashbox", null, { shouldDirty: false })
        }
        prevCurrencyIdRef.current = currencyId
    }, [currencyId]) // eslint-disable-line react-hooks/exhaustive-deps

    const typeOptions = [
        { value: "RECEIPT", label: t("types.RECEIPT") },
        { value: "PAYMENT", label: t("types.PAYMENT") },
        { value: "ADJUSTMENT", label: t("types.ADJUSTMENT") },
    ]

    return (
        <Rhform form={ctrl.form} onSubmit={() => ctrl.onSubmit(ctrl.isEditing ? undefined : "draft")}>
            <div className="p-6 space-y-4">
                <RhfSelectField<PaymentFormValues, "type">
                    name="type"
                    label={t("type")}
                    options={typeOptions}
                    disabled={disabled || ctrl.isEditing}
                    required
                />
                <RhfDateField
                    name="date"
                    label={t("date")}
                    required
                    disabled={disabled}
                />
                <RhfResourceSelect<PaymentFormValues, "cashbox", CashboxesClient, PaymentRelationalField>
                    name="cashbox"
                    label={t("cashbox")}
                    client={(api) => api.cashboxes}
                    getLabel={(it) => `${(it as Record<string, string>)["code"]} — ${(it as Record<string, string>)["name"]}`}
                    getValue={(it) => it}
                    extraQuery={currencyId ? { filters: { currencyId: { $eq: currencyId } } } : undefined}
                    required
                    disabled={disabled}
                />
                <RhfResourceSelect<PaymentFormValues, "party", PartiesClient, PaymentRelationalField>
                    name="party"
                    label={t("party")}
                    client={(api) => api.parties}
                    getLabel={(it) => (it as Record<string, string>)["name"]}
                    getValue={(it) => it}
                    disabled={disabled}
                />
                <div className="grid grid-cols-2 gap-3">
                    <RhfResourceSelect<PaymentFormValues, "currency", CurrenciesClient, PaymentRelationalField>
                        name="currency"
                        label={t("currency")}
                        client={(api) => api.currencies}
                        getLabel={(it) => `${(it as Record<string, string>)["code"]} — ${(it as Record<string, string>)["name"]}`}
                        getValue={(it) => it}
                        required
                        disabled={disabled}
                    />
                    <RhfResourceSelect<PaymentFormValues, "fiscalPeriod", FiscalPeriodsClient, PaymentRelationalField>
                        name="fiscalPeriod"
                        label={t("fiscalPeriod")}
                        client={(api) => api["fiscal-periods"]}
                        getLabel={(it) => (it as Record<string, string>)["name"]}
                        getValue={(it) => it}
                        required
                        disabled={disabled}
                    />
                </div>
                <RhfTextField
                    name="amount"
                    label={t("amount")}
                    type="number"
                    required
                    disabled={disabled}
                />
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
        </Rhform>
    )
}
