"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import type { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form"
import { tenantResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import { unwrapApiData } from "./unwrap-api-data"

/** Relational values the API can pre-fill on creation forms. */
export type FormDefaultKey = "fiscalPeriod" | "currency" | "warehouse" | "unit" | "cashbox" | "receivableAccount" | "payableAccount"

export type FormDefaults = {
    fiscalPeriod?: { id: string; name: string } | null
    currency?: { id: string; code: string; name: string } | null
    cashbox?: { id: string; code: string; name: string } | null
    warehouse?: { id: string; code: string; name: string } | null
    unit?: { id: string; name: string; abbreviation: string } | null
    receivableAccount?: { id: string; code: string; name: string } | null
    payableAccount?: { id: string; code: string; name: string } | null
}

/** Declarative opt-in: form field name → default value to pre-fill it from. */
export type FormDefaultsMap<TValues extends FieldValues> = Partial<
    Record<Path<TValues>, FormDefaultKey>
>

export function useFormDefaultsQuery() {
    const api = useApi()

    return useQuery({
        queryKey: [tenantResource.routes.defaults],
        queryFn: async () => unwrapApiData<FormDefaults>(await api.tenants.getDefaults()),
        staleTime: 5 * 60 * 1000,
    })
}

function isEmptyValue(value: unknown): boolean {
    if (value == null) return true
    if (typeof value === "object") return !(value as { id?: string }).id
    return value === ""
}

/**
 * Pre-fills a creation form's empty fields from the tenant's configured
 * defaults. Runs only when `enabled`, never overwrites a value the mapper or
 * user already set, and never marks fields dirty.
 */
export function useApplyFormDefaults<TValues extends FieldValues>({
    form,
    map,
    enabled,
}: {
    form: UseFormReturn<TValues>
    map: FormDefaultsMap<TValues>
    enabled: boolean
}): void {
    const { data: defaults } = useFormDefaultsQuery()

    useEffect(() => {
        if (!enabled || !defaults) return
        for (const [field, key] of Object.entries(map) as Array<[Path<TValues>, FormDefaultKey]>) {
            const value = defaults[key]
            if (!value) continue
            if (!isEmptyValue(form.getValues(field))) continue
            form.setValue(field, value as PathValue<TValues, typeof field>, { shouldDirty: false })
        }
    }, [enabled, defaults, form]) // eslint-disable-line react-hooks/exhaustive-deps
}
