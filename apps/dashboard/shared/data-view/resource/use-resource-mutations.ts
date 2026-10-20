"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import type { ICrudClient } from "@devloggers/api-client"
import { useApiErrorMessage } from "@/shared/hooks/use-api-error-message"

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
    const apiErrorMessage = useApiErrorMessage()
    const { mutateAsync: deleteItem } = useMutation({
        mutationFn: (id: string) => {
            const promise = client.destroy(id)
            toast.promise(promise, {
                loading: t("toastDeleting"),
                success: t("toastDeleted"),
                error: (err: unknown) => apiErrorMessage(err, t("toastDeleteFailed")),
            })
            return promise
        },
        onSuccess: () => config.invalidateQuery(),
    })

    return { deleteItem }
}