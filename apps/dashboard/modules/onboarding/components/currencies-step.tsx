"use client"

import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { useApi } from "@/shared/useApi"

type Props = {
    codeToId: Record<string, string>
    onSuccess: () => void
}

const CURRENCIES = [
    {
        code: "SYP",
        nameKey: "onboarding.currencies.sypName",
        symbol: "£",
        symbolAr: "ل.س",
        isBase: false,
    },
    {
        code: "USD",
        nameKey: "onboarding.currencies.usdName",
        symbol: "$",
        symbolAr: "$",
        isBase: true,
    },
]

export function CurrenciesStep({ codeToId, onSuccess }: Props) {
    const api = useApi()
    const t = useTranslations("business")

    const { mutate, isPending, error } = useMutation({
        mutationFn: () => api.onboarding.stepCurrencies(codeToId),
        onSuccess,
    })

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                {t("onboarding.currencies.description")}
            </p>

            <div className="border rounded-lg divide-y">
                {CURRENCIES.map((currency) => (
                    <div key={currency.code} className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{currency.code}</span>
                                <span className="text-sm text-muted-foreground">
                                    {t(currency.nameKey)}
                                </span>
                                {currency.isBase && (
                                    <Badge variant="secondary" className="text-xs">
                                        {t("onboarding.currencies.baseIndicator")}
                                    </Badge>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {currency.symbolAr} / {currency.symbol}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

            <Button onClick={() => mutate()} disabled={isPending} className="w-full">
                {isPending ? t("onboarding.buttons.saving") : t("onboarding.buttons.continue")}
            </Button>
        </div>
    )
}
