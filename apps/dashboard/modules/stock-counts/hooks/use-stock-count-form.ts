"use client"

import { useRef } from "react"
import { useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { UseFormReturn } from "react-hook-form"
import type { StockCountsClient } from "@devloggers/api-client"
import { useApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useFormDialog } from "@/shared/components/form-dialog"
import { toastErrorMessage } from "@/shared/lib/utils"
import {
    stockCountFormSchema,
    stockCountsFormConfig,
    DEFAULT_STOCK_COUNT_FORM_VALUES,
    mapStockCountToFormValues,
    type StockCountFormValues,
} from "../stock-counts.config"

export type StockCountSubmitMode = "draft" | "post"

export type StockCountFormController = {
    form: UseFormReturn<StockCountFormValues>
    isBusy: boolean
    submit: (mode: StockCountSubmitMode) => void
}

type CreatedStockCount = { data?: { id?: string } }

/**
 * Drives the stock-count create form. Stock counts have no edit path, so this
 * only ever creates. "Save as draft" creates in DRAFT status; "Save & post"
 * creates then immediately posts the returned id, mirroring the invoice
 * draft/complete split.
 */
export function useStockCountForm({
    resourceId,
    initialData,
    paramKey,
    onSuccess,
}: {
    resourceId?: string | null
    initialData?: unknown
    paramKey?: string
    onSuccess?: () => void
}): StockCountFormController {
    const api = useApi()
    const client = api["stock-counts"] as StockCountsClient
    const t = useTranslations("business.resources.stockCounts")
    const tf = useTranslations("system.resourceForm")
    const queryClient = useQueryClient()
    const { close } = useFormDialog(paramKey)

    const { form, isInitializing } = useResourceForm<StockCountFormValues, unknown>({
        schema: stockCountFormSchema,
        defaultValues: DEFAULT_STOCK_COUNT_FORM_VALUES,
        resourceId,
        initialize: (id) => client.show(id),
        initialData,
        queryKey: [client.key, "show", resourceId],
        mapToFormValues: mapStockCountToFormValues,
    })

    const modeRef = useRef<StockCountSubmitMode>("draft")

    const { mutate, isPending } = useFormMutation(form, {
        mutationFn: (values: StockCountFormValues) => {
            const shouldPost = modeRef.current === "post"
            const promise = (async () => {
                const created = (await client.create(
                    stockCountsFormConfig.toCreate(values),
                )) as CreatedStockCount
                if (shouldPost) {
                    const id = created?.data?.id
                    if (!id) throw new Error("Created stock count is missing an id")
                    await client.post(id)
                }
                return created
            })()

            toast.promise(promise, {
                loading: shouldPost ? t("actions.posting") : tf("creating"),
                success: shouldPost
                    ? t("actions.posted")
                    : tf("created", { entity: t("entity") }),
                error: (err: unknown) =>
                    toastErrorMessage(err, tf("createFailed", { entity: t("entity") })),
            })

            return promise
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [client.key] })
            form.reset(DEFAULT_STOCK_COUNT_FORM_VALUES)
            close()
            onSuccess?.()
        },
    })

    return {
        form,
        isBusy: isPending || isInitializing,
        submit: (mode) => {
            modeRef.current = mode
            form.handleSubmit((values) => mutate(values))()
        },
    }
}
