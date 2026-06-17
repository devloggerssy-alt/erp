"use client"

import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { confirm } from "@/shared/components/confirm-dialog"

export function useExpenseActions(onSuccess?: () => void) {
    const api = useApi()
    const queryClient = useQueryClient()
    const t = useTranslations("business.resources.expenses")

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: [api.expenses.key] })

    const { mutateAsync: postExpense } = useMutation({
        mutationFn: async (id: string) => {
            const confirmed = await confirm({
                title: t("actions.postTitle"),
                description: t("actions.postConfirm"),
                confirmLabel: t("actions.post"),
            })
            if (!confirmed) return

            const promise = api.expenses.post(id)
            toast.promise(promise, {
                loading: t("actions.post") + "…",
                success: t("actions.post") + " ✓",
                error: (err: Error) => err.message,
            })
            return promise
        },
        onSuccess: () => {
            invalidate()
            onSuccess?.()
        },
    })

    const { mutateAsync: cancelExpense } = useMutation({
        mutationFn: async (id: string) => {
            const confirmed = await confirm({
                title: t("actions.cancelTitle"),
                description: t("actions.cancelConfirm"),
                confirmLabel: t("actions.cancel"),
                variant: "destructive",
            })
            if (!confirmed) return

            const promise = api.expenses.cancel(id)
            toast.promise(promise, {
                loading: t("actions.cancel") + "…",
                success: t("actions.cancel") + " ✓",
                error: (err: Error) => err.message,
            })
            return promise
        },
        onSuccess: () => {
            invalidate()
            onSuccess?.()
        },
    })

    return { postExpense, cancelExpense }
}
