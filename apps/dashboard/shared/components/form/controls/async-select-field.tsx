"use client"

import { useRef } from "react"
import type { AsyncOption, BaseFieldControlProps } from "../types"
import { Loader2 } from "lucide-react"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/shared/components/ui/combobox"

const defaultGetOptionValue = (opt: any) => opt.value
const defaultGetOptionLabel = (opt: any) => opt.label
function defaultGetOptionKey(opt: any): string {
  const v = defaultGetOptionValue(opt)
  if (typeof v === "string" || typeof v === "number") return String(v)
  return String(opt.id ?? JSON.stringify(v))
}

// ── Single-select ──

export type AsyncSelectFieldProps<TOption = AsyncOption> = BaseFieldControlProps<any> & {
  options: TOption[]
  loading?: boolean
  onInputValueChange?: (value: string) => void
  placeholder?: string
  getOptionValue?: (option: TOption) => any
  getOptionLabel?: (option: TOption) => string
  getOptionKey?: (option: TOption) => string
}

export function AsyncSelectField<TOption = AsyncOption>({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  options,
  loading,
  onInputValueChange,
  placeholder = "Search...",
  getOptionValue = defaultGetOptionValue,
  getOptionLabel = defaultGetOptionLabel,
  getOptionKey = defaultGetOptionKey,
}: AsyncSelectFieldProps<TOption>) {
  const anchorRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={anchorRef}>
      <Combobox
        value={value}
        onValueChange={(val) => onChange(val)}
        disabled={disabled}
        onInputValueChange={(val, { reason }) => {
          if (reason === "input-change") {
            onInputValueChange?.(val)
          }
        }}
      >
        <ComboboxInput
          placeholder={placeholder}
          showClear={!!value}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
        />
        <ComboboxContent anchor={anchorRef}>
          <ComboboxList>
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading &&
              options.map((opt) => (
                <ComboboxItem key={getOptionKey(opt)} value={getOptionValue(opt)}>
                  {getOptionLabel(opt)}
                </ComboboxItem>
              ))}
            {!loading && options.length === 0 && (
              <ComboboxEmpty>No results found</ComboboxEmpty>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

// ── Multi-select ──

export type AsyncMultiSelectFieldProps<TOption = AsyncOption> = BaseFieldControlProps<any[]> & {
  options: TOption[]
  loading?: boolean
  onInputValueChange?: (value: string) => void
  placeholder?: string
  getOptionValue?: (option: TOption) => any
  getOptionLabel?: (option: TOption) => string
  getOptionKey?: (option: TOption) => string
}

export function AsyncMultiSelectField<TOption = AsyncOption>({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  options,
  loading,
  onInputValueChange,
  placeholder = "Search...",
  getOptionValue = defaultGetOptionValue,
  getOptionLabel = defaultGetOptionLabel,
  getOptionKey = defaultGetOptionKey,
}: AsyncMultiSelectFieldProps<TOption>) {
  const anchorRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={anchorRef}>
      <Combobox
        multiple
        value={value ?? []}
        onValueChange={(val) => onChange(val as any[])}
        disabled={disabled}
        onInputValueChange={(val, { reason }) => {
          if (reason === "input-change") {
            onInputValueChange?.(val)
          }
        }}
      >
        <ComboboxInput
          placeholder={placeholder}
          showClear={value && value.length > 0}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
        />
        <ComboboxContent anchor={anchorRef}>
          <ComboboxList>
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading &&
              options.map((opt) => (
                <ComboboxItem key={getOptionKey(opt)} value={getOptionValue(opt)}>
                  {getOptionLabel(opt)}
                </ComboboxItem>
              ))}
            {!loading && options.length === 0 && (
              <ComboboxEmpty>No results found</ComboboxEmpty>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
