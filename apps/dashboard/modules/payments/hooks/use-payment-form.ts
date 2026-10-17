"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { type UseFormReturn } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useApplyFormDefaults } from "@/shared/hooks/use-form-defaults"
import { narrowEnum } from "@/shared/lib/narrow-enum"
import type { CrudShowResponse, PaymentsClient } from "@devloggers/api-client"
import {
    DEFAULT_PAYMENT_FORM_VALUES,
    mapPaymentToFormValues,
    paymentFormSchema,
    toCreatePaymentDto,
    toUpdatePaymentDto,
    type PaymentFormValues,
} from "../payments.config"

const PAYMENT_STATUSES = ["DRAFT", "POSTED", "CANCELLED"] as const
type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/** The generated response types `status` as `string`; narrow it to the domain union. */
const asPaymentStatus = narrowEnum(PAYMENT_STATUSES)

// The cache holds `api.payments.show()`'s generated envelope, so its type derives from the client.
type CachedPaymentEntry = CrudShowResponse<PaymentsClient>

export type UsePaymentFormOptions = {
    paymentId: string | null
    open: boolean
    onSuccess?: () => void
    onClose: () => void
}

export type PaymentFormController = {
    form: UseFormReturn<PaymentFormValues>
    isEditing: boolean
    isReadOnly: boolean
    isBusy: boolean
    isPending: boolean
    status: PaymentStatus | undefined
    paymentNumber: string | undefined
    onSubmit: (mode?: "draft" | "complete") => void
}

export function usePaymentForm({
    paymentId,
    open,
    onSuccess,
    onClose,
}: UsePaymentFormOptions): PaymentFormController {
    const api = useApi()
    const tf = useTranslations("system.resourceForm")
    const t = useTranslations("business.resources.payments")
    const queryClient = useQueryClient()

    const { form, isEditing, isInitializing } = useResourceForm<PaymentFormValues, unknown>({
        schema: paymentFormSchema,
        defaultValues: DEFAULT_PAYMENT_FORM_VALUES,
        resourceId: paymentId,
        initialize: (id) => api.payments.show(id),
        mapToFormValues: mapPaymentToFormValues,
        queryKey: [api.payments.key, "show", paymentId],
    })

    // Pre-fill cashbox / currency / fiscal period from tenant defaults (create only).
    useApplyFormDefaults({
        form,
        enabled: open && !isEditing,
        map: {
            fiscalPeriod: "fiscalPeriod",
            currency: "currency",
            cashbox: "cashbox",
        },
    })

    const cached = isEditing
        ? queryClient.getQueryData<CachedPaymentEntry>([api.payments.key, "show", paymentId])
        : undefined

    const status = asPaymentStatus(cached?.data?.status)
    const paymentNumber: string | undefined = cached?.data?.number
    const isReadOnly = status === "POSTED" || status === "CANCELLED"

    const submitModeRef = useRef<"draft" | "complete">("draft")

    const { mutate, isPending } = useFormMutation(form, {
        mutationFn: (values: PaymentFormValues) => {
            const complete = submitModeRef.current === "complete"
            const promise = isEditing && paymentId
                ? api.payments.update(paymentId, toUpdatePaymentDto(values))
                : api.payments.create(toCreatePaymentDto(values, { complete }))

            toast.promise(promise, {
                loading: isEditing ? tf("updating") : tf("creating"),
                success: isEditing
                    ? tf("updated", { entity: t("entity") })
                    : tf("created", { entity: t("entity") }),
                error: isEditing
                    ? tf("updateFailed", { entity: t("entity") })
                    : tf("createFailed", { entity: t("entity") }),
            })

            return promise
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.payments.key] })
            form.reset(DEFAULT_PAYMENT_FORM_VALUES)
            onSuccess?.()
            onClose()
        },
    })

    useEffect(() => {
        if (!open) {
            form.reset(DEFAULT_PAYMENT_FORM_VALUES)
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    return {
        form,
        isEditing,
        isReadOnly,
        isBusy: isInitializing || isPending,
        isPending,
        status,
        paymentNumber,
        onSubmit: (mode = "draft") => {
            submitModeRef.current = mode
            form.handleSubmit((values) => mutate(values))()
        },
    }
}
