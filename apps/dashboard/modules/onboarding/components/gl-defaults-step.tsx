"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/shared/components/ui/button"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select"
import {
    glDefaultsStepSchema, GL_DEFAULT_CODES,
    type GlDefaultsStepValues, onboardingApi,
} from "../onboarding.config"

type Props = {
    codeToId: Record<string, string>
    onSuccess: () => void
    token: string
}

export function GlDefaultsStep({ codeToId, onSuccess, token }: Props) {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4040"

    const { data: accountsData } = useQuery({
        queryKey: ["accounts", "list"],
        queryFn: () =>
            fetch(`${API_BASE}/accounts?limit=200`, {
                headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json()),
    })

    const accounts: Array<{ id: string; code: string; name: { en?: string; ar?: string } }> =
        accountsData?.data ?? []

    const defaultValues: GlDefaultsStepValues = {
        defaultSalesAccountId:      codeToId[GL_DEFAULT_CODES.defaultSalesAccountId]      ?? "",
        defaultPurchaseAccountId:   codeToId[GL_DEFAULT_CODES.defaultPurchaseAccountId]   ?? "",
        defaultTaxAccountId:        codeToId[GL_DEFAULT_CODES.defaultTaxAccountId]        ?? "",
        defaultReceivableAccountId: codeToId[GL_DEFAULT_CODES.defaultReceivableAccountId] ?? "",
        defaultPayableAccountId:    codeToId[GL_DEFAULT_CODES.defaultPayableAccountId]    ?? "",
    }

    const { setValue, watch, handleSubmit, reset, formState: { errors } } = useForm<GlDefaultsStepValues>({
        resolver: zodResolver(glDefaultsStepSchema),
        defaultValues,
    })

    useEffect(() => {
        if (Object.values(codeToId).some(Boolean)) {
            reset(defaultValues)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [codeToId])

    const { mutate, isPending, error } = useMutation({
        mutationFn: (values: GlDefaultsStepValues) => onboardingApi.stepGlDefaults(token, values),
        onSuccess,
    })

    const GL_FIELDS: Array<{ key: keyof GlDefaultsStepValues; label: string }> = [
        { key: "defaultSalesAccountId",      label: "Default Sales Account" },
        { key: "defaultPurchaseAccountId",   label: "Default Purchase Account" },
        { key: "defaultTaxAccountId",        label: "Default Tax Account" },
        { key: "defaultReceivableAccountId", label: "Default Receivable Account" },
        { key: "defaultPayableAccountId",    label: "Default Payable Account" },
    ]

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
            <p className="text-sm text-muted-foreground">
                These accounts are used automatically when posting invoices and payments.
            </p>
            {GL_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                    <label className="text-sm font-medium">{label} *</label>
                    <Select
                        value={watch(key)}
                        onValueChange={(v) => setValue(key, v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select account…" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                    {a.code} — {a.name?.en ?? a.name?.ar}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors[key] && <p className="text-sm text-destructive">{errors[key]?.message}</p>}
                </div>
            ))}
            {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving…" : "Continue →"}
            </Button>
        </form>
    )
}
