"use client"

import { useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useApi } from "@/shared/useApi"
import { toastErrorMessage } from "@/shared/lib/utils"
import type { PosCartLine } from "../pos.config"

function newRequestId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
    return `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function usePosCheckout() {
    const api = useApi()
    const t = useTranslations("business.pos")
    const [clientRequestId, setClientRequestId] = useState(newRequestId)

    const mutation = useMutation({
        mutationFn: (args: { lines: PosCartLine[]; partyId: string | null; tendered: number }) => {
            const promise = api.pos.checkout({
                partyId: args.partyId,
                tendered: args.tendered,
                clientRequestId,
                lines: args.lines.map((l) => ({
                    itemId: l.itemId,
                    unitId: l.unitId,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    discountPercent: l.discountPercent || 0,
                })),
            })
            toast.promise(promise, {
                loading: t("checkingOut"),
                success: t("saleCompleted"),
                error: (err: unknown) => toastErrorMessage(err, t("checkoutFailed")),
            })
            return promise
        },
        onSuccess: () => setClientRequestId(newRequestId()),
    })

    return useMemo(
        () => ({
            checkout: mutation.mutateAsync,
            isPending: mutation.isPending,
            result: mutation.data?.data ?? null,
            reset: mutation.reset,
        }),
        [mutation.mutateAsync, mutation.isPending, mutation.data, mutation.reset],
    )
}
