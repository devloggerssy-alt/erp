"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import type { ICrudClient } from "@devloggers/api-client"
import { toastErrorMessage } from "@/shared/lib/utils"

export type UseResourceMutationsConfig = {
    invalidateQuery: () => void
}

export type UseResourceMutationsResult = {
    deleteItem: (id: string) => Promise<unknown>
}

export function useResourceMutations<TClient extends ICrudClient>(
    client: TClient,
    config: UseResourceMutationsConfig,
): UseResourceMutationsResult {
    const t = useTranslations("system.resource")
    const { mutateAsync: deleteItem } = useMutation({
        mutationFn: (id: string) => {
            const promise = client.destroy(id)
            toast.promise(promise, {
                loading: t("toastDeleting"),
                success: t("toastDeleted"),
                error: (err: unknown) => toastErrorMessage(err, t("toastDeleteFailed")),
            })
            return promise
        },
        onSuccess: () => config.invalidateQuery(),
    })

    return { deleteItem }
}