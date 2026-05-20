"use client"

import { useFormContext, useController } from "react-hook-form"
import type { FieldValues, FieldPath } from "react-hook-form"
import type { CrudCollectionClient } from "@devloggers/api-client"
import { FieldShell } from "../field-shell"
import {
  ResourceSelectField,
  ResourceMultiSelectField,
  type ResourceSelectFieldProps,
  type ResourceMultiSelectFieldProps,
} from "../controls/resource-select-field"

type OmitControlProps<T> = Omit<T, "value" | "onChange" | "onBlur" | "disabled" | "invalid">

// ── Single Select ──

export type RhfResourceSelectProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TClient extends CrudCollectionClient = CrudCollectionClient,
  TValue = string,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
} & OmitControlProps<ResourceSelectFieldProps<TClient, TValue>>

export function RhfResourceSelect<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TClient extends CrudCollectionClient = CrudCollectionClient,
  TValue = string,
>(props: RhfResourceSelectProps<TValues, TName, TClient, TValue>) {
  const {
    name,
    label,
    description,
    required,
    disabled: disabledProp,
    ...controlProps
  } = props

  const { control } = useFormContext<TValues>()
  const { field, fieldState: { error } } = useController({
    name,
    control,
    disabled: disabledProp,
  })

  return (
    <FieldShell label={label} error={error?.message} description={description} required={required}>
      <ResourceSelectField
        value={field.value ?? null}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={field.disabled}
        invalid={!!error}
        {...(controlProps as any)}
      />
    </FieldShell>
  )
}

// ── Multi Select ──

export type RhfResourceMultiSelectProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TClient extends CrudCollectionClient = CrudCollectionClient,
  TValue = string,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
} & OmitControlProps<ResourceMultiSelectFieldProps<TClient, TValue>>

export function RhfResourceMultiSelect<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TClient extends CrudCollectionClient = CrudCollectionClient,
  TValue = string,
>(props: RhfResourceMultiSelectProps<TValues, TName, TClient, TValue>) {
  const {
    name,
    label,
    description,
    required,
    disabled: disabledProp,
    ...controlProps
  } = props

  const { control } = useFormContext<TValues>()
  const { field, fieldState: { error } } = useController({
    name,
    control,
    disabled: disabledProp,
  })

  return (
    <FieldShell label={label} error={error?.message} description={description} required={required}>
      <ResourceMultiSelectField
        value={field.value ?? []}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={field.disabled}
        invalid={!!error}
        {...(controlProps as any)}
      />
    </FieldShell>
  )
}