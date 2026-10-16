"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeftRightIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { IconTooltip } from "@/shared/components/icon-tooltip"
import { cn } from "@/shared/lib/utils"
import type { BaseFieldControlProps } from "../types"
import {
  basePerDocument,
  documentPerBase,
  exchangeRateFromBasePerDocument,
  exchangeRateFromDocumentPerBase,
  formatExchangeRate,
  parseExchangeRateInput,
} from "../lib/exchange-rate"

export type CurrencyExchangeInputProps = BaseFieldControlProps<number> & {
  /** Code of the document/transaction currency (e.g. `SYP`). */
  documentCurrencyCode?: string | null
  /** Code of the tenant base currency (e.g. `USD`). */
  baseCurrencyCode?: string | null
}

type Side = "document-per-base" | "base-per-document"

function formatOrEmpty(value: number | null): string {
  return value == null ? "" : formatExchangeRate(value)
}

function RateRow({
  unitCode,
  otherCode,
  value,
  onChange,
  onFocus,
  onBlur,
  disabled,
  invalid,
  inputName,
}: {
  unitCode: string
  otherCode: string
  value: string
  onChange: (raw: string) => void
  onFocus: () => void
  onBlur: () => void
  disabled?: boolean
  invalid?: boolean
  inputName?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        1
      </span>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
        {unitCode}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">=</span>
      <Input
        inputMode="decimal"
        dir="ltr"
        className="h-8 flex-1 tabular-nums"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-label={`1 ${unitCode} = ${otherCode}`}
        name={inputName}
      />
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
        {otherCode}
      </span>
    </div>
  )
}

/**
 * Two-way currency exchange-rate input.
 *
 * Renders both reciprocal views of the rate — `1 BASE = x DOC` and
 * `1 DOC = 1/x BASE` — and lets the user type into either. The stored
 * value stays `exchangeRate` (base-currency units per 1 document unit), so
 * weak-currency rates such as `1 SYP = 0.000072 USD` can be entered as the
 * friendly `1 USD = 13900 SYP` without a calculator.
 */
export function CurrencyExchangeInput({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  invalid,
  documentCurrencyCode,
  baseCurrencyCode,
}: CurrencyExchangeInputProps) {
  const t = useTranslations("system.exchangeRate")
  // The field the user is currently typing in keeps an unformatted draft so
  // partial input ("13900.", "0.00007") survives; every other view is derived
  // from `value` so external changes (edit load, form reset) reflect at once.
  const [draft, setDraft] = useState<{ side: Side; raw: string } | null>(null)
  const [flipped, setFlipped] = useState(false)

  const isSameCurrency =
    !!documentCurrencyCode && documentCurrencyCode === baseCurrencyCode

  // A document in the base currency always has a rate of 1.
  useEffect(() => {
    if (isSameCurrency && value !== 1) onChange(1)
  }, [isSameCurrency, value, onChange])

  if (!documentCurrencyCode) {
    return (
      <p
        className={cn(
          "text-xs text-muted-foreground",
          invalid && "text-destructive"
        )}
      >
        {t("selectCurrency")}
      </p>
    )
  }

  if (isSameCurrency) {
    return (
      <p
        className={cn(
          "text-xs text-muted-foreground",
          invalid && "text-destructive"
        )}
      >
        {t("sameAsBase")}
      </p>
    )
  }

  // Base currency not resolved yet — fall back to a plain input so the form
  // never breaks.
  if (!baseCurrencyCode) {
    return (
      <Input
        inputMode="decimal"
        dir="ltr"
        type="number"
        step="any"
        className="tabular-nums"
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => {
          const next = parseExchangeRateInput(event.target.value)
          if (next != null) onChange(next)
        }}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        name={name}
      />
    )
  }

  const derivedDocumentPerBase = formatOrEmpty(documentPerBase(value))
  const derivedBasePerDocument = formatOrEmpty(basePerDocument(value))

  const documentPerBaseValue =
    draft?.side === "document-per-base" ? draft.raw : derivedDocumentPerBase
  const basePerDocumentValue =
    draft?.side === "base-per-document" ? draft.raw : derivedBasePerDocument

  const startEditing = (side: Side, raw: string) => setDraft({ side, raw })

  const stopEditing = () => {
    setDraft(null)
    onBlur?.()
  }

  const handleChange = (side: Side, raw: string) => {
    setDraft({ side, raw })
    const parsed = parseExchangeRateInput(raw)
    if (parsed == null) return
    const rate =
      side === "document-per-base"
        ? exchangeRateFromDocumentPerBase(parsed)
        : exchangeRateFromBasePerDocument(parsed)
    if (rate == null) return
    onChange(rate)
  }

  const baseFirstRow = (
    <RateRow
      key="base-first"
      unitCode={baseCurrencyCode}
      otherCode={documentCurrencyCode}
      value={documentPerBaseValue}
      onChange={(raw) => handleChange("document-per-base", raw)}
      onFocus={() => startEditing("document-per-base", derivedDocumentPerBase)}
      onBlur={stopEditing}
      disabled={disabled}
      invalid={invalid}
      inputName={name}
    />
  )
  const documentFirstRow = (
    <RateRow
      key="document-first"
      unitCode={documentCurrencyCode}
      otherCode={baseCurrencyCode}
      value={basePerDocumentValue}
      onChange={(raw) => handleChange("base-per-document", raw)}
      onFocus={() => startEditing("base-per-document", derivedBasePerDocument)}
      onBlur={stopEditing}
      disabled={disabled}
      invalid={invalid}
    />
  )

  const rows = flipped
    ? [documentFirstRow, baseFirstRow]
    : [baseFirstRow, documentFirstRow]

  return (
    <div
      className={cn(
        "rounded-md border bg-muted/20 p-2",
        invalid && "border-destructive"
      )}
      data-invalid={invalid || undefined}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col gap-1.5" dir="ltr">
          {rows}
        </div>
        <IconTooltip label={t("swap")} disabled={disabled}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => setFlipped((current) => !current)}
            disabled={disabled}
            aria-label={t("swap")}
          >
            <ArrowLeftRightIcon className="size-3.5" />
          </Button>
        </IconTooltip>
      </div>
    </div>
  )
}
