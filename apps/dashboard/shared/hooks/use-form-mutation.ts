"use client"

import { useMutation, type UseMutationOptions } from "@tanstack/react-query"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { ApiError } from "@garage/api"

export function useFormMutation<TValues extends FieldValues, TResponse = unknown>(
    form: UseFormReturn<TValues>,
    options: UseMutationOptions<TResponse, Error, TValues>,
) {
    return useMutation<TResponse, Error, TValues>({
        ...options,
        onError: (err, vars,values, ctx) => {
            if (err instanceof ApiError && err.validationErrors) {
                Object.entries(err.validationErrors).forEach(([field, msgs]) => {
                    form.setError(field as any, { message: msgs[0] })
                })
            }
            options.onError?.(err, vars, values, ctx,)
        },
    })
}
