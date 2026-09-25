"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useApi } from "@/shared/useApi"
import { toastErrorMessage } from "@/shared/lib/utils"

export function usePosSettings() {
    const api = useApi()
    const t = useTranslations("business.pos")
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: ["pos", "settings"],
        queryFn: () => api.pos.getSettings(),
    })

    const provision = useMutation({
        mutationFn: () => {
            const promise = api.pos.provision()
            toast.promise(promise, {
                loading: t("provisioning"),
                success: t("provisioned"),
                error: (err: unknown) => toastErrorMessage(err, t("provisionFailed")),
            })
            return promise
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pos", "settings"] }),
    })

    return {
        settings: query.data?.data ?? null,
        isLoading: query.isLoading,
        provision: provision.mutateAsync,
        isProvisioning: provision.isPending,
    }
}
