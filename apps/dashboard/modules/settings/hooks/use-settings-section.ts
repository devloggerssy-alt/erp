"use client"

import { useEffect } from "react"
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ZodType } from "zod"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"

export type UseSettingsSectionOptions<TValues extends FieldValues> = {
  schema: ZodType<TValues>
  defaultValues: DefaultValues<TValues>
  queryKey: QueryKey
  /** Loads the section's current values (already mapped to form shape). */
  load: () => Promise<TValues>
  /** Persists the section. Returns a promise the toast tracks. */
  submit: (values: TValues) => Promise<unknown>
  messages: { saving: string; saved: string; failed: string }
}

export type SettingsSectionController<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  isLoading: boolean
  isBusy: boolean
  error: Error | null
  onSubmit: (values: TValues) => void
}

/**
 * Drives a singleton (one-per-tenant) settings card: loads current values,
 * binds an RHF form, and saves in place (no dialog). Reuses useFormMutation so
 * 422 field errors map onto matching field names.
 */
export function useSettingsSection<TValues extends FieldValues>({
  schema,
  defaultValues,
  queryKey,
  load,
  submit,
  messages,
}: UseSettingsSectionOptions<TValues>): SettingsSectionController<TValues> {
  const queryClient = useQueryClient()
  const form = useForm<TValues>({ resolver: zodResolver(schema as any), defaultValues })

  const { data, isLoading } = useQuery({ queryKey, queryFn: load })

  useEffect(() => {
    if (data) form.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const { mutate, error, isPending } = useFormMutation(form, {
    mutationFn: (values: TValues) => {
      const promise = submit(values)
      toast.promise(promise, {
        loading: messages.saving,
        success: messages.saved,
        error: messages.failed,
      })
      return promise
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    form,
    isLoading,
    isBusy: isPending || isLoading,
    error: error ?? null,
    onSubmit: (values: TValues) => mutate(values),
  }
}
