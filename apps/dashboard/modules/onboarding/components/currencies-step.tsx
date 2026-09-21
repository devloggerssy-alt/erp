"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { useApi } from "@/shared/useApi"

type CurrencyRow = {
    code: string
    nameEn: string
    nameAr: string
    isBase: boolean
}

type Props = {
    onSuccess: () => void
}

function makeRow(isBase = false): CurrencyRow {
    return { code: "", nameEn: "", nameAr: "", isBase }
}

export function CurrenciesStep({ onSuccess }: Props) {
    const api = useApi()
    const t = useTranslations("business")
    const [rows, setRows] = useState<CurrencyRow[]>([makeRow(true)])

    const updateRow = (index: number, patch: Partial<CurrencyRow>) => {
        setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    }

    const setBase = (index: number) => {
        setRows((prev) => prev.map((row, i) => ({ ...row, isBase: i === index })))
    }

    const addRow = () => setRows((prev) => [...prev, makeRow(false)])
    const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index))

    const { mutate, isPending, error } = useMutation({
        mutationFn: () =>
            api.onboarding.stepCurrencies(
                rows.map((row) => ({
                    code: row.code.trim().toUpperCase(),
                    name: { ar: row.nameAr.trim(), en: row.nameEn.trim() },
                    isBase: row.isBase,
                })),
            ),
        onSuccess,
    })

    const canSubmit = rows.length > 0 && rows.every((r) => r.code.trim() && r.nameAr.trim()) && rows.some((r) => r.isBase)

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                {t("onboarding.currencies.description")}
            </p>

            <div className="space-y-3">
                {rows.map((row, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                placeholder={t("onboarding.currencies.codePlaceholder")}
                                value={row.code}
                                maxLength={3}
                                onChange={(e) => updateRow(index, { code: e.target.value })}
                            />
                            <Input
                                placeholder={t("onboarding.currencies.nameEnPlaceholder")}
                                value={row.nameEn}
                                onChange={(e) => updateRow(index, { nameEn: e.target.value })}
                            />
                        </div>
                        <Input
                            placeholder={t("onboarding.currencies.nameArPlaceholder")}
                            value={row.nameAr}
                            onChange={(e) => updateRow(index, { nameAr: e.target.value })}
                        />
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={row.isBase} onCheckedChange={() => setBase(index)} />
                                {t("onboarding.currencies.baseIndicator")}
                            </label>
                            {rows.length > 1 && (
                                <Button variant="ghost" size="sm" onClick={() => removeRow(index)}>
                                    {t("onboarding.buttons.remove")}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Button variant="outline" onClick={addRow} className="w-full">
                {t("onboarding.currencies.addCurrency")}
            </Button>

            {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

            <Button onClick={() => mutate()} disabled={isPending || !canSubmit} className="w-full">
                {isPending ? t("onboarding.buttons.saving") : t("onboarding.buttons.continue")}
            </Button>
        </div>
    )
}
