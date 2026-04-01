"use client"

import type { FieldValues } from "react-hook-form"
import { FormProvider } from "react-hook-form"
import type { RhformProps } from "./types"

export function Rhform<TValues extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
}: RhformProps<TValues>) {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e) }}
        noValidate
        className={className}
      >
        {children}
      </form>
    </FormProvider>
  )
}
