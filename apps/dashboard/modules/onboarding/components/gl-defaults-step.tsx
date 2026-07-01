"use client"

import { useEffect, useMemo } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/shared/components/ui/button"
import { useApi } from "@/shared/useApi"
import { accountResource } from "@devloggers/api-contracts"
import { RhfAccountField } from "@/modules/accounts/components/account-picker"
import {
    glDefaultsStepSchema, GL_DEFAULT_CODES,
    type GlDefaultsStepValues,
} from "../onboarding.config"
import type { AccountListItem } from "@/modules/accounts/accounts.types"

type Props = {
    codeToId: Record<string, string>
    onSuccess: () => void
}

const GL_FIELDS: Array<{ key: keyof GlDefaultsStepValues; label: string }> = [
    { key: "defaultSalesAccount",      label: "Default Sales Account" },
    { key: "defaultPurchaseAccount",   label: "Default Purchase Account" },
    { key: "defaultTaxAccount",        label: "Default Tax Account" },
    { key: "defaultReceivableAccount", label: "Default Receivable Account" },
    { key: "defaultPayableAccount",    label: "Default Payable Account" },
]

const DEFAULT_GL_VALUES: GlDefaultsStepValues = {
    defaultSalesAccount:      null,
    defaultPurchaseAccount:   null,
    defaultTaxAccount:        null,
    defaultReceivableAccount: null,
    defaultPayableAccount:    null,
}

export function GlDefaultsStep({ codeToId, onSuccess }: Props) {
    const api = useApi()

    const { data } = useQuery({
        queryKey: [accountResource.key, "list", "picker"],
        queryFn: () => api[accountResource.key].list({ page: 1, limit: 500 }),
        staleTime: 60_000,
    })

    const accounts = useMemo(() => (data?.data ?? []) as unknown as AccountListItem[], [data])

    const form = useForm<GlDefaultsStepValues>({
        resolver: zodResolver(glDefaultsStepSchema),
        defaultValues: DEFAULT_GL_VALUES,
    })

    useEffect(() => {
        if (!accounts.length || !Object.values(codeToId).some(Boolean)) return
        const prefill = {} as GlDefaultsStepValues
        for (const { key } of GL_FIELDS) {
            const code = GL_DEFAULT_CODES[key]
            const id = codeToId[code]
            const acct = id ? accounts.find((a) => a.id === id) : undefined
            prefill[key] = acct ? { id: acct.id, code: acct.code, name: acct.name } : null
        }
        form.reset(prefill)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accounts, codeToId])

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: GlDefaultsStepValues) =>
            api.onboarding.stepGlDefaults({
                defaultSalesAccountId:      values.defaultSalesAccount?.id ?? "",
                defaultPurchaseAccountId:   values.defaultPurchaseAccount?.id ?? "",
                defaultTaxAccountId:        values.defaultTaxAccount?.id ?? "",
                defaultReceivableAccountId: values.defaultReceivableAccount?.id ?? "",
                defaultPayableAccountId:    values.defaultPayableAccount?.id ?? "",
            }),
        onSuccess,
    })

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    These accounts are used automatically when posting invoices and payments.
                </p>
                {GL_FIELDS.map(({ key, label }) => (
                    <RhfAccountField key={key} name={key} label={label} required />
                ))}
                {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? "Saving…" : "Continue →"}
                </Button>
            </form>
        </FormProvider>
    )
}
