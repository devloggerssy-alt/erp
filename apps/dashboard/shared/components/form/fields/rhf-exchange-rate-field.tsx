"use client"

import { useController, useFormContext } from "react-hook-form"
import type { FieldPath, FieldValues } from "react-hook-form"
import { FieldShell } from "../field-shell"
import { CurrencyExchangeInput } from "../controls/currency-exchange-input"
import { useCurrencies } from "@/shared/hooks/use-currencies"

export type RhfExchangeRateFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
  /** Selected document currency id (form value keeps only the id in edit mode). */
  documentCurrencyId?: string | null
}

/**
 * RHF-bound currency exchange-rate field. Resolves the document and base
 * currency codes from the shared currencies list, so callers only need to pass
 * the selected currency id.
 */
export function RhfExchangeRateField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
>({
  name,
  label,
  description,
  required,
  disabled,
  documentCurrencyId,
}: RhfExchangeRateFieldProps<TValues, TName>) {
  const { control } = useFormContext<TValues>()
  const {
    field,
    fieldState: { error },
  } = useController({ name, control, disabled })
  const { data: currencies } = useCurrencies()

  const numericValue = Number(field.value)
  const value =
    Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1
  const list = currencies ?? []
  const baseCurrencyCode =
    list.find((currency) => currency.isBase)?.code ?? null
  const documentCurrencyCode =
    list.find((currency) => currency.id === documentCurrencyId)?.code ?? null

  return (
    <FieldShell
      label={label}
      error={error?.message}
      description={description}
      required={required}
    >
      <CurrencyExchangeInput
        value={value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        name={field.name}
        disabled={field.disabled}
        invalid={!!error}
        documentCurrencyCode={documentCurrencyCode}
        baseCurrencyCode={baseCurrencyCode}
      />
    </FieldShell>
  )
}
