"use client"

import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { confirm } from "@/shared/components/confirm-dialog"

/**
 * Row-level actions for stock counts. Posting a DRAFT is the only mutation
 * exposed in the list — stock counts have no edit/delete UI.
 */
export function useStockCountActions(onSuccess?: () => void) {
    const api = useApi()
    const queryClient = useQueryClient()
    const t = useTranslations("business.resources.stockCounts")

    const { mutateAsync: postStockCount } = useMutation({
        mutationFn: async (id: string) => {
            const confirmed = await confirm({
                title: t("actions.postTitle"),
                description: t("actions.postConfirm"),
                confirmLabel: t("actions.post"),
            })
            if (!confirmed) return

            const promise = api["stock-counts"].post(id)
            toast.promise(promise, {
                loading: t("actions.posting"),
                success: t("actions.posted"),
                error: (err: Error) => err.message,
            })
            return promise
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api["stock-counts"].key] })
            onSuccess?.()
        },
    })

    return { postStockCount }
}
